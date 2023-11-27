import { AgentRoles, ISOLang, UserCon } from '@glosuite/shared';
import { HttpService } from '@nestjs/axios';
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
import { MiniUserPayload } from 'src/domain/interfaces';
import {
  ProductItemRepository,
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import { OrderRepository } from 'src/repositories/orders';
import { AssignOrdersToInput, AssignOrdersToOutput } from './dto';
import {
  MovementType,
  StepStatus,
  StockMovementAreaType,
  TriggerType,
  TriggeredBy,
} from 'src/domain/enums/flows';
import { USERS_RESOURCE } from 'src/domain/constants/public.constants';
import { DeliveryMode, OrderStep, OrderVersion } from 'src/domain/enums/orders';
import { ItemState } from 'src/domain/enums/items';
import { MiniOrderOutput } from 'src/domain/dto/orders';
import { Location } from 'src/domain/entities/warehouses';
import { LocationRepository } from 'src/repositories/warehouses';
import { OrderProcessing, StockMovement } from 'src/domain/entities/flows';
import {
  OrderProcessingRepository,
  StockMovementRepository,
} from 'src/repositories/flows';
import { OrderReferenceService } from 'src/services/references/orders';
import { PaymentMode, PaymentStatus } from 'src/domain/enums/finance';

type ValidationResult = {
  orders: Order[];
  assignTo: MiniUserPayload;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class AssignOrdersToService {
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
    @InjectRepository(StockMovement)
    private readonly _stockMovementRepository: StockMovementRepository,
    @InjectRepository(OrderProcessing)
    private readonly _orderProcessingRepository: OrderProcessingRepository,
    private readonly _httpService: HttpService,
    private readonly _orderReferenceService: OrderReferenceService,
  ) {}

  async assignOrdersTo(
    input: AssignOrdersToInput,
    user: UserCon,
    accessToken: string,
  ): Promise<AssignOrdersToOutput> {
    const validationResult = await this._tryValidation(
      input,
      user,
      accessToken,
    );

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(validationResult, input);

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
    input: AssignOrdersToInput,
  ): Promise<AssignOrdersToOutput> {
    try {
      const { orders, assignTo, lang, user } = result;

      const productItemsToUpdate: ProductItem[] = [];
      const stockMovementsToAdd: StockMovement[] = [];
      const orderProcessingsToSave: OrderProcessing[] = [];
      const ordersToEdit: Order[] = [];

      for (const order of orders) {
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
          orderProcessingsToSave.push(lastOrderProcessing);
        }

        order.orderStatus = StepStatus.ASSIGNED;
        order.orderStep = OrderStep.DELIVERY_IN_PROGRESS;
        order.assignToId = input.assignToId;
        order.assignedTo = assignTo;
        order.assignedAt = new Date();
        order.assignedBy = user;

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

        orderProcessingsToSave.push(orderProcessing);

        for (const productItem of order.productItems) {
          productItem.status = StepStatus.ASSIGNED;
          productItem.state = ItemState.DELIVERY_PROCESSING;

          const sourceLocation = await this._locationRepository.findOne({
            where: { id: productItem.locationId },
          });

          // create stockMovement for each item
          const stockMovement = new StockMovement();

          stockMovement.movementType = MovementType.OUT;
          stockMovement.triggerType = TriggerType.AUTO;
          stockMovement.triggeredBy = TriggeredBy.ASSIGN_ORDER;
          stockMovement.createdBy = user;

          stockMovement.productItem = productItem;
          stockMovement.productItemId = productItem.id;

          stockMovement.order = order;
          stockMovement.orderId = order.id;

          stockMovement.sourceType = StockMovementAreaType.LOCATION;

          stockMovement.sourceLocation = sourceLocation;
          stockMovement.sourceLocationId = productItem.locationId;

          stockMovementsToAdd.push(stockMovement);

          productItem.locationId = null;
          productItem.location = null;

          productItemsToUpdate.push(productItem);

          // set locations totalItems
          sourceLocation.totalItems -= 1;
          await this._locationRepository.save(sourceLocation);

          /**
           * Set product and variant quantities
           */
          const variantToUpdate =
            await this._productVariantRepository.findOneOrFail({
              where: { id: productItem.productVariantId },
              relations: ['product'],
            });

          const productToUpdate = variantToUpdate.product;

          // Variant
          variantToUpdate.quantity.deliveryProcessing += 1;
          variantToUpdate.quantity.reserved -= 1;
          await this._productVariantRepository.save(variantToUpdate);

          // Product
          productToUpdate.quantity.deliveryProcessing += 1;
          productToUpdate.quantity.reserved -= 1;
          await this._productRepository.save(productToUpdate);
        }

        ordersToEdit.push(order);
      }

      await this._orderRepository.save(ordersToEdit);
      await this._productItemRepository.save(productItemsToUpdate);
      await this._stockMovementRepository.save(stockMovementsToAdd);
      await this._orderProcessingRepository.save(orderProcessingsToSave);

      return new AssignOrdersToOutput(
        orders.map((order) => new MiniOrderOutput(order)),
        orders.length,
      );
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${AssignOrdersToService.name} - ${this._tryExecution.name} - ` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: AssignOrdersToInput,
    user: UserCon,
    accessToken: string,
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
            role === AgentRoles.LOGISTIC_MANAGER,
        )
      ) {
        throw new UnauthorizedException(
          `You are not allowed to assign a delivery`,
        );
      }

      // Get orders to output
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

          orders.push(order);
        }),
      );

      if (
        orders.some(
          (order) =>
            order.prepaidIsRequired &&
            (order.paymentMode !== PaymentMode.BEFORE_DELIVERY ||
              order.paymentStatus === PaymentStatus.UNPAID),
        )
      ) {
        throw new BadRequestException(
          `Some orders you are trying to assign requires payment before delivery`,
        );
      }

      if (orders.some((order) => order.deliveryMode !== DeliveryMode.AT_HOME)) {
        throw new BadRequestException(`Some orders are not at FLEET`);
      }

      if (orders.some((order) => order.orderStatus !== StepStatus.TO_DELIVER)) {
        throw new BadRequestException(
          `Some orders you are trying to output are not ${StepStatus.TO_DELIVER}`,
        );
      }

      if (orders.some((order) => order.version !== OrderVersion.CURRENT)) {
        throw new BadRequestException(
          `Some orders changes have not been applied`,
        );
      }

      /**
       * Restrictions
       */
      if (
        !user.workStation.warehouse ||
        (orders.some(
          (order) =>
            order.storagePoint.reference !==
            user.workStation.warehouse.reference,
        ) &&
          !user.roles.some((role) => role === AgentRoles.LOGISTIC_MANAGER))
      ) {
        throw new UnauthorizedException(
          `Some orders you are trying to assign are not from your warehoue (${user.workStation?.warehouse?.name})`,
        );
      }

      /**
       * Get the delivery agent from auth microservice
       */
      let assignTo: MiniUserPayload;

      const path = `${process.env.AUTH_API_PATH}/${USERS_RESOURCE}`;
      console.log('AUTH ENDPOINT ', path);

      await this._httpService.axiosRef
        .get(path + `/${input.assignToId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Accept-Encoding': 'gzip,deflate,compress',
          },
        })
        .then(async (response) => {
          console.log(
            `${response.config.method} on ${response.config.url}. Result=${response.statusText}`,
            'Data ',
            response.data,
          );

          if (
            !response.data.roles.some(
              (role) =>
                role === AgentRoles.FLEET_SUPERVISOR ||
                role === AgentRoles.DELIVER_AGENT ||
                role === AgentRoles.LOGISTIC_MANAGER,
            )
          ) {
            throw new UnauthorizedException(
              `This agent is not authorized to deliver this command`,
            );
          }

          assignTo = {
            firstname: response.data.firstname ? response.data.firstname : null,
            lastname: response.data.lastname,
            email: response.data.email,
          };
        })
        .catch((error) => {
          throw new HttpException(
            error.message,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        });

      return {
        orders,
        assignTo,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${AssignOrdersToService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
