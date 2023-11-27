import { ISOLang, UserCon } from '@glosuite/shared';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from 'src/domain/entities/orders';
import { PurchaseOrder, VariantPurchased } from 'src/domain/entities/purchases';
import { OrderRepository } from 'src/repositories/orders';
import {
  PurchaseOrderRepository,
  VariantPurchasedRepository,
} from 'src/repositories/purchases';
import { SendOrderToPurchaseInput } from './dto';
import { OrderItemOutput } from 'src/domain/dto/orders';
import {
  OperationLineState,
  OperationStatus,
  StepStatus,
} from 'src/domain/enums/flows';
import { OrderProcessing } from 'src/domain/entities/flows';
import { OrderProcessingRepository } from 'src/repositories/flows';
import { OrderReferenceService } from 'src/services/references/orders';
import { PurchaseOrderReferenceService } from 'src/services/references/purchases';
import { OrderService, ProductsService } from 'src/services/generals';
import { ProductVariant } from 'src/domain/entities/items';
import { ProductVariantRepository } from 'src/repositories/items';

type ValidationResult = {
  order: Order;
  user: UserCon;
  lang: ISOLang;
};

@Injectable()
export class SendOrderToPurchaseService {
  constructor(
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(VariantPurchased)
    private readonly _variantPurchasedRepository: VariantPurchasedRepository,
    @InjectRepository(OrderProcessing)
    private readonly _orderProcessingRepository: OrderProcessingRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepsitory: ProductVariantRepository,
    private readonly _orderReferenceService: OrderReferenceService,
    private readonly _purchaseOrderReferenceService: PurchaseOrderReferenceService,
    private readonly _productService: ProductsService,
    private readonly _orderService: OrderService,
  ) {}

  async sendOrderToPurchase(
    input: SendOrderToPurchaseInput,
    user: UserCon,
  ): Promise<OrderItemOutput> {
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
  ): Promise<OrderItemOutput> {
    try {
      const { order, user, lang } = result;

      const orderProcessingsToSave: OrderProcessing[] = [];

      const actualState = order.orderStep;
      const actualStatus = order.orderStatus;

      const lastOrderProcessing = await this._orderProcessingRepository.findOne(
        {
          where: {
            state: actualState,
            status: actualStatus,
            orderId: order.id,
          },
        },
      );

      if (lastOrderProcessing) {
        lastOrderProcessing.endDate = new Date();
        orderProcessingsToSave.push(lastOrderProcessing);
      }

      order.orderStatus = StepStatus.TO_BUY;

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

      if (
        !order.purchaseOrder ||
        (order.purchaseOrder &&
          order.purchaseOrder.status === OperationStatus.CANCELED)
      ) {
        // Create the purchase order
        const purchaseOrder = new PurchaseOrder();

        purchaseOrder.reference =
          await this._purchaseOrderReferenceService.generate(
            purchaseOrder,
            false,
          );
        purchaseOrder.storagePointId = order.storagePointId;
        purchaseOrder.storagePoint = order.storagePoint;
        purchaseOrder.order = order;
        purchaseOrder.orderRef = order.reference;
        purchaseOrder.createdBy = user;

        await this._purchaseOrderRepository.save(purchaseOrder);

        /**
         * Add variantsToPurchased
         */
        const variantsToPurchasedToAdd: VariantPurchased[] = [];
        let position = 0;

        for (const articleOrdered of order.articleOrdereds) {
          const variant = await this._productVariantRepsitory.findOneOrFail({
            where: { id: articleOrdered.productVariantId },
          });

          const variantPurchased = new VariantPurchased();

          variantPurchased.position = position;
          variantPurchased.quantity = articleOrdered.quantity;
          variantPurchased.state = OperationLineState.PENDING;

          const lastSupplier =
            await this._productService.getLastSupplierAndPurchaseCost(variant);

          if (lastSupplier.supplier !== null) {
            variantPurchased.supplier = lastSupplier.supplier;
            variantPurchased.supplierId = lastSupplier.supplier.id;
          }

          variantPurchased.purchaseCost = lastSupplier.purchaseCost;
          variantPurchased.purchaseOrderId = purchaseOrder.id;
          variantPurchased.purchaseOrder = purchaseOrder;
          variantPurchased.variant = variant;
          variantPurchased.variantId = variant.id;

          variantPurchased.createdBy = user;

          variantsToPurchasedToAdd.push(variantPurchased);
          position++;
        }

        await this._variantPurchasedRepository.save(variantsToPurchasedToAdd);

        order.purchaseOrder = purchaseOrder;

        await this._orderRepository.save(order);
      }

      await this._orderProcessingRepository.save(orderProcessingsToSave);

      const orderModel = await this._orderService.buildOrderModel(order);

      return new OrderItemOutput(orderModel, lang);
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        `${SendOrderToPurchaseService.name} - ${this._tryExecution.name} - `,
        error.message ? error.message : error,
      );
    }
  }

  private async _tryValidation(
    input: SendOrderToPurchaseInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const order = await this._orderRepository.findOne({
        where: { reference: input.orderReference },
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
          'stockMovements',
        ],
      });

      if (!order) {
        throw new NotFoundException(
          `The order with reference '${input.orderReference}' does not exist`,
        );
      }

      if (order.orderStatus !== StepStatus.TO_PICK_PACK) {
        throw new BadRequestException(
          `You can only send a ${StepStatus.TO_PICK_PACK} to purchase. This one is ${order.orderStatus}`,
        );
      }

      if (order.articleOrdereds.length === 0) {
        throw new BadRequestException(
          `This order has no articles ordered, it cannot be send to purchase.`,
        );
      }

      if (
        order.purchaseOrder &&
        order.purchaseOrder.status === OperationStatus.VALIDATED
      ) {
        throw new BadRequestException(
          `This order already has a ${order.purchaseOrder.status} purchase order: ${order.purchaseOrder.reference}`,
        );
      }

      return { order, user, lang };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${SendOrderToPurchaseService.name} - ${this._tryValidation.name} - `,
        error.message ? error.message : error,
      );
    }
  }
}
