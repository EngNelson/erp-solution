import { ISOLang, UserCon } from '@glosuite/shared';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderItemOutput } from 'src/domain/dto/orders';
import { Order } from 'src/domain/entities/orders';
import { OrderRepository } from 'src/repositories/orders';
import { RefundOrderInput } from './dto';
import { CustomerReturnState, StepStatus } from 'src/domain/enums/flows';
import { PaymentStatus } from 'src/domain/enums/finance';
import { OrderStep, OrderVersion } from 'src/domain/enums/orders';
import { OrderService } from 'src/services/generals';
import { ProductItem } from 'src/domain/entities/items';
import { ProductItemRepository } from 'src/repositories/items';
import { OrderReferenceService } from 'src/services/references/orders';
import { OrderProcessingRepository } from 'src/repositories/flows';
import { OrderProcessing } from 'src/domain/entities/flows';

type ValidationResult = {
  order: Order;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class RefundOrderService {
  constructor(
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(OrderProcessing)
    private readonly _orderProcessingRepository: OrderProcessingRepository,
    private readonly _orderService: OrderService,
    private readonly _orderReferenceService: OrderReferenceService,
  ) {}

  async refundOrder(
    input: RefundOrderInput,
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
      const { order, lang, user } = result;

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
        await this._orderProcessingRepository.save(lastOrderProcessing);
      }

      order.orderStatus = StepStatus.REFUNDED;
      order.orderStep = OrderStep.REFUNDED;
      order.refundedBy = user;
      order.refundedAt = new Date();

      await this._orderRepository.save(order);

      const orderProcessing = new OrderProcessing();

      orderProcessing.reference =
        await this._orderReferenceService.generateOrderProcessingReference(
          order,
        );
      orderProcessing.state = order.orderStep;
      orderProcessing.status = order.orderStatus;
      orderProcessing.startDate = new Date();
      orderProcessing.orderId = order.id;
      orderProcessing.order = order;

      await this._orderProcessingRepository.save(orderProcessing);

      /**
       * Build output
       */
      const output = await this._orderRepository.findOne(order.id, {
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

      const orderModel = await this._orderService.buildOrderModel(output);

      return new OrderItemOutput(orderModel, lang);
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${RefundOrderService.name} - ${this._tryExecution.name} - ` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: RefundOrderInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      // get the order to refund
      const order = await this._orderRepository.findOne({
        where: { id: input.orderId },
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
        throw new NotFoundException(`Order with id ${input.orderId} not found`);
      }

      if (order.version !== OrderVersion.CURRENT) {
        throw new BadRequestException(
          `Cannot refund ${order.version} order. ${order.reference} - ${order.barcode}`,
        );
      }

      if (
        order.orderStatus !== StepStatus.DELIVERED ||
        order.paymentStatus === PaymentStatus.UNPAID
      ) {
        throw new BadRequestException(
          `Cannot refund a ${order.orderStatus} or ${order.paymentStatus} order`,
        );
      }

      await Promise.all(
        order.productItems.map(async (productItem) => {
          const itemDetails = await this._productItemRepository.findOne({
            where: { id: productItem.id },
            relations: ['customerReturn'],
          });

          if (
            order.orderStatus === StepStatus.DELIVERED &&
            (!itemDetails.customerReturn ||
              itemDetails.customerReturn.state !==
                CustomerReturnState.VALIDATED)
          ) {
            throw new BadRequestException(
              `This order cannot be refunded. The product '${productItem.barcode}' have not been returned`,
            );
          }
        }),
      );

      return {
        order,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${RefundOrderService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
