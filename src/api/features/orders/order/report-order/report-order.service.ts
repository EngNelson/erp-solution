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
import { Order } from 'src/domain/entities/orders';
import { CommentModel } from 'src/domain/interfaces';
import { OrderRepository } from 'src/repositories/orders';
import { ReportOrderInput } from './dto';
import { OrderItemOutput } from 'src/domain/dto/orders';
import { StepStatus } from 'src/domain/enums/flows';
import { OrderVersion } from 'src/domain/enums/orders';
import { OrderService } from 'src/services/generals';

type ValidationResult = {
  order: Order;
  deliveryDate: Date;
  comments: CommentModel[];
  isComment: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class ReportOrderService {
  constructor(
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    private readonly _orderService: OrderService,
  ) {}

  async reportOrder(
    input: ReportOrderInput,
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
      const { order, deliveryDate, comments, isComment, lang, user } = result;

      order.preferedDeliveryDate = deliveryDate;
      if (isComment) {
        order.comments = comments;
      }
      order.orderStatus = StepStatus.REPORTED;
      order.reportedAt = new Date();
      order.reportedBy = user;

      await this._orderRepository.save(order);

      const orderModel = await this._orderService.buildOrderModel(order);

      return new OrderItemOutput(orderModel, lang);
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${ReportOrderService.name} - ${this._tryExecution.name} - ` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: ReportOrderInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      if (
        !user.roles.some(
          (role) =>
            role === AgentRoles.FLEET_SUPERVISOR ||
            role === AgentRoles.LOGISTIC_MANAGER ||
            role === AgentRoles.EXPEDITION_SUPERVISOR ||
            role === AgentRoles.EXPEDITION_AGENT ||
            role === AgentRoles.PUS_COORDINATOR ||
            role === AgentRoles.PUS_MANAGER ||
            role === AgentRoles.PUS_AGENT,
        )
      ) {
        throw new UnauthorizedException(
          `You are not allowed to report a delivery`,
        );
      }

      const order = await this._orderRepository.findOne({
        where: { barcode: input.orderBarcode },
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
          `Order of barcode ${input.orderBarcode} is not found`,
        );
      }

      if (order.version !== OrderVersion.CURRENT) {
        throw new BadRequestException(
          `Cannot report ${order.version} order. ${order.reference} - ${order.barcode}`,
        );
      }

      // if (
      //   (order.deliveryMode === DeliveryMode.AT_HOME &&
      //     order.orderStatus !== StepStatus.TO_DELIVER &&
      //     order.orderStatus !== StepStatus.ASSIGNED) ||
      //   (order.deliveryMode === DeliveryMode.IN_AGENCY &&
      //     order.orderStatus !== StepStatus.PICKED_UP)
      // ) {
      //   throw new BadRequestException(
      //     `You cannot report ${order.orderStatus} order`,
      //   );
      // }

      if (
        order.orderStatus === StepStatus.DELIVERED ||
        order.orderStatus === StepStatus.REFUNDED ||
        order.orderStatus === StepStatus.CANCELED ||
        order.orderStatus === StepStatus.COMPLETE
      ) {
        throw new BadRequestException(
          `You cannot report ${order.orderStatus} order`,
        );
      }

      const now = new Date();

      console.log(
        'Debug 1 ',
        (order.preferedDeliveryDate &&
          new Date(order.preferedDeliveryDate) >=
            new Date(input.deliveryDate)) ||
          new Date(input.deliveryDate) < now,
      );

      console.log(
        'Debug 2 ',
        order.preferedDeliveryDate &&
          new Date(order.preferedDeliveryDate) >= new Date(input.deliveryDate),
      );

      console.log('Debug 3 ', order.preferedDeliveryDate);

      console.log('Debug 4 ', new Date(input.deliveryDate) < now);

      if (
        (order.preferedDeliveryDate &&
          new Date(order.preferedDeliveryDate) >=
            new Date(input.deliveryDate)) ||
        new Date(input.deliveryDate) < now
      ) {
        throw new BadRequestException(
          `Please provide a valid delivery date to report. Report date = ${new Date(
            input.deliveryDate,
          )}, now = ${now}`,
        );
      }

      let comments: CommentModel[] = [];
      if (input.comment && !isNullOrWhiteSpace(input.comment)) {
        comments = this._orderService.buildOrderComments(
          order,
          input.comment,
          user,
        );
      }

      return {
        order,
        deliveryDate: input.deliveryDate,
        comments,
        isComment: !!input.comment,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${ReportOrderService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
