import {
  AgentRoles,
  ISOLang,
  UserCon,
  isNullOrWhiteSpace,
} from '@glosuite/shared';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Product,
  ProductItem,
  ProductVariant,
} from 'src/domain/entities/items';
import { Order } from 'src/domain/entities/orders';
import {
  ProductItemRepository,
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import { OrderRepository } from 'src/repositories/orders';
import { ValidateDeliveryInput, ValidateDeliveryOutput } from './dto';
import {
  DeliveryMode,
  OrderStep,
  OrderVersion,
  ToBeCashed,
} from 'src/domain/enums/orders';
import {
  MovementType,
  StepStatus,
  StockMovementAreaType,
  TriggerType,
  TriggeredBy,
} from 'src/domain/enums/flows';
import {
  AdvanceHistoryStatus,
  PaymentMethod,
  PaymentMode,
  PaymentStatus,
} from 'src/domain/enums/finance';
import { ItemState } from 'src/domain/enums/items';
import { UpdateMagentoDataService } from 'src/services/generals';
import { MiniOrderOutput } from 'src/domain/dto/orders';
import { OrderProcessing, StockMovement } from 'src/domain/entities/flows';
import {
  OrderProcessingRepository,
  StockMovementRepository,
} from 'src/repositories/flows';
import { OrderReferenceService } from 'src/services/references/orders';
import { Location } from 'src/domain/entities/warehouses';
import { LocationRepository } from 'src/repositories/warehouses';
import { UPDATE_MAGENTO_ORDER_STATUS } from 'src/domain/constants';
import { AllowAction, MagentoOrderStatus } from 'src/domain/enums/magento';

type ValidationResult = {
  orders: Order[];
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class ValidateDeliveryService {
  constructor(
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(OrderProcessing)
    private readonly _orderProcessingRepository: OrderProcessingRepository,
    @InjectRepository(StockMovement)
    private readonly _stockMovementRepository: StockMovementRepository,
    private readonly _orderReferenceService: OrderReferenceService,
    private readonly _updateMagentoDataService: UpdateMagentoDataService,
  ) {}

  async validateDelivery(
    input: ValidateDeliveryInput,
    user: UserCon,
  ): Promise<ValidateDeliveryOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    result: ValidationResult,
  ): Promise<ValidateDeliveryOutput> {
    try {
      const { orders, lang, user } = result;

      const productItemsToUpdate: ProductItem[] = [];
      const variantsToEditQuantities: ProductVariant[] = [];
      const orderProcessingsToAdd: OrderProcessing[] = [];
      const ordersUpdated: Order[] = [];
      const stockMovementsToAdd: StockMovement[] = [];

      for (const order of orders) {
        /**
         * Order processing treatments
         */
        const actualState = order.orderStep;
        const actualStatus = order.orderStatus;

        const lastOrderProcessing =
          await this._orderProcessingRepository.findOne({
            where: {
              state: actualState,
              status: actualStatus,
              orderId: order.id,
            },
          });

        if (lastOrderProcessing) {
          lastOrderProcessing.endDate = new Date();
          orderProcessingsToAdd.push(lastOrderProcessing);
        }

        order.orderStep = OrderStep.PAYMENT_IN_PROGRESS;
        if (order.paymentStatus === PaymentStatus.CASHED_AND_INCOMPLETE) {
          order.orderStatus = StepStatus.COMPLETE;
        } else {
          order.orderStatus = StepStatus.DELIVERED;
          order.paymentStatus = PaymentStatus.PAID;
        }
        order.deliveredAt = new Date();
        order.deliverValidatedBy = user;
        order.toBeCashed = ToBeCashed.YES;

        const orderProcessing = new OrderProcessing();

        orderProcessing.reference =
          await this._orderReferenceService.generateOrderProcessingReference(
            order,
          );
        orderProcessing.state = order.orderStep;
        orderProcessing.status = order.orderStatus;
        orderProcessing.startDate = new Date();
        orderProcessing.order = order;
        orderProcessing.orderId = order.id;

        orderProcessingsToAdd.push(orderProcessing);

        if (order.deliveryMode === DeliveryMode.AT_HOME) {
          // let i = 1;
          for (const productItem of order.productItems) {
            productItem.status = StepStatus.DELIVERED;
            productItem.state = ItemState.DELIVERED;

            productItemsToUpdate.push(productItem);

            /**
             * Set product and variant quantities
             */
            const variantToUpdate =
              await this._productVariantRepository.findOneOrFail({
                where: { id: productItem.productVariantId },
                relations: ['product'],
              });

            const productToUpdate = variantToUpdate.product;

            // Add
            // Variant
            variantToUpdate.quantity.delivered += 1;
            variantToUpdate.quantity.deliveryProcessing -= 1;
            await this._productVariantRepository.save(variantToUpdate);

            productToUpdate.quantity.delivered += 1;
            productToUpdate.quantity.deliveryProcessing -= 1;
            await this._productRepository.save(productToUpdate);

            if (
              !variantsToEditQuantities.find(
                (variant) => variant.id === variantToUpdate.id,
              )
            ) {
              variantsToEditQuantities.push(variantToUpdate);
            }
          }
        } else if (order.deliveryMode === DeliveryMode.IN_AGENCY) {
          // let i = 1;
          for (const productItem of order.productItems) {
            productItem.status = StepStatus.DELIVERED;
            productItem.state = ItemState.DELIVERED;

            const location = await this._locationRepository.findOneOrFail({
              where: { id: productItem.locationId },
            });

            // create stockMovement for each item
            const stockMovement = new StockMovement();

            stockMovement.movementType = MovementType.OUT;
            stockMovement.triggerType = TriggerType.AUTO;
            stockMovement.triggeredBy = TriggeredBy.VALIDATE_DELIVERY;
            stockMovement.createdBy = user;

            stockMovement.productItem = productItem;
            stockMovement.productItemId = productItem.id;

            stockMovement.order = order;
            stockMovement.orderId = order.id;

            stockMovement.sourceType = StockMovementAreaType.LOCATION;

            stockMovement.sourceLocation = location;
            stockMovement.sourceLocationId = productItem.locationId;

            stockMovementsToAdd.push(stockMovement);

            location.totalItems -= 1;
            await this._locationRepository.save(location);

            productItem.location = null;
            productItem.locationId = null;

            productItemsToUpdate.push(productItem);

            /**
             * Set product and variant quantities
             */
            const variantToUpdate =
              await this._productVariantRepository.findOneOrFail({
                where: { id: productItem.productVariantId },
                relations: ['product'],
              });

            const productToUpdate = variantToUpdate.product;

            // Add
            // Variant
            variantToUpdate.quantity.delivered += 1;
            variantToUpdate.quantity.reserved -= 1;
            await this._productVariantRepository.save(variantToUpdate);

            productToUpdate.quantity.delivered += 1;
            productToUpdate.quantity.reserved -= 1;
            await this._productRepository.save(productToUpdate);

            if (
              !variantsToEditQuantities.find(
                (variant) => variant.id === variantToUpdate.id,
              )
            ) {
              variantsToEditQuantities.push(variantToUpdate);
            }
          }
        }

        ordersUpdated.push(order);
      }

      await this._orderRepository.save(ordersUpdated);
      await this._productItemRepository.save(productItemsToUpdate);
      await this._orderProcessingRepository.save(orderProcessingsToAdd);
      await this._stockMovementRepository.save(stockMovementsToAdd);

      this._updateMagentoDataService.updateProductsQuantities(
        variantsToEditQuantities,
      );

      return new ValidateDeliveryOutput(
        ordersUpdated.map((order) => new MiniOrderOutput(order)),
        ordersUpdated.length,
      );
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${ValidateDeliveryService.name} - ${this._tryExecution.name} - ` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: ValidateDeliveryInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      // Is the user have privileges
      if (
        !user.roles.some(
          (role) =>
            role === AgentRoles.FLEET_SUPERVISOR ||
            role === AgentRoles.LOGISTIC_MANAGER ||
            role === AgentRoles.EXPEDITION_SUPERVISOR ||
            role === AgentRoles.EXPEDITION_AGENT ||
            role === AgentRoles.PUS_MANAGER ||
            role === AgentRoles.PUS_COORDINATOR ||
            role === AgentRoles.PUS_AGENT ||
            role === AgentRoles.PUS_CASHIER ||
            role === AgentRoles.SUPER_ADMIN,
        )
      ) {
        throw new UnauthorizedException(
          `You are not allowed to validate a delivery`,
        );
      }

      if (
        !user.workStation.warehouse &&
        !user.roles.some(
          (role) =>
            role === AgentRoles.SUPER_ADMIN || role === AgentRoles.ADMIN,
        )
      ) {
        throw new UnauthorizedException(
          `You cannot validate a delivery since you are not attached to a warehouse`,
        );
      }

      // Get orders to validate delivery
      const orders: Order[] = [];

      await Promise.all(
        input.orderBarcodes.map(async (barcode) => {
          const order = await this._orderRepository.findOne({
            where: { barcode },
            relations: [
              'billingAddress',
              'deliveryAddress',
              'voucher',
              'storagePoint',
              'child',
              'parent',
              'customerReturns',
              'productItems',
              'transferts',
              'articleOrdereds',
              'orderProcessings',
              'purchaseOrder',
            ],
          });

          if (!order) {
            throw new NotFoundException(
              `Order of barcode ${barcode} is not found`,
            );
          }

          /**
           * If fleet:
           * **** orderStatus = assigned and orderStep = delivery_in_progress
           */
          if (
            order.deliveryMode === DeliveryMode.AT_HOME &&
            (order.orderStatus !== StepStatus.ASSIGNED ||
              order.orderStep !== OrderStep.DELIVERY_IN_PROGRESS)
          ) {
            throw new BadRequestException(
              `You cannot validate ${order.orderStatus} and ${order.orderStep} order delivery. ${order.reference}`,
            );
          }

          /**
           * If pus:
           * **** orderStatus = picked_up and orderStep = pending_withdrawal
           */
          if (
            order.deliveryMode === DeliveryMode.IN_AGENCY &&
            (order.orderStatus !== StepStatus.PICKED_UP ||
              order.orderStep !== OrderStep.PENDING_WITHDRAWAL)
          ) {
            throw new BadRequestException(
              `You cannot validate ${order.orderStatus} and ${order.orderStep} order delivery. ${order.reference}`,
            );
          }

          /**
           * Check if paymentRef is provided for uncash payments
           */
          if (
            order.paymentMethod !== PaymentMethod.CASH &&
            isNullOrWhiteSpace(order.paymentRef)
          ) {
            throw new BadRequestException(
              `Please provide ${order.paymentMethod} payment reference for ${order.reference} order.`,
            );
          }

          if (order.version !== OrderVersion.CURRENT) {
            throw new BadRequestException(
              `Cannot validate ${order.version} order delivery`,
            );
          }

          orders.push(order);
        }),
      );

      if (
        orders.some(
          (order) =>
            order.prepaidIsRequired &&
            order.paymentStatus === PaymentStatus.UNPAID &&
            (order.paymentMode !== PaymentMode.ADVANCE_PAYMENT ||
              !order.advance.history.find(
                (item) => item.status === AdvanceHistoryStatus.PAID,
              )),
        )
      ) {
        throw new BadRequestException(
          `Some deliveries you are trying to validate requires payment before delivery`,
        );
      }

      if (
        !user.workStation.warehouse ||
        (orders.some(
          (order) =>
            user.workStation.warehouse.reference !==
            order.storagePoint.reference,
        ) &&
          !user.roles.some((role) => role === AgentRoles.LOGISTIC_MANAGER))
      ) {
        throw new UnauthorizedException(
          `Some deliveries you are trying to validate have not been proceed in the warehouse you are working in.`,
        );
      }

      return {
        orders,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${ValidateDeliveryService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
