import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { GetOrderByIdItemOutput, OrderItemOutput } from 'src/domain/dto/orders';
import { Order } from 'src/domain/entities/orders';
import { OrderRepository } from 'src/repositories/orders';
import { OrderService } from 'src/services/generals';
import { GetOrderByIdInput } from './dto';

@Injectable()
export class GetOrderByIdService {
  constructor(
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    private readonly _orderService: OrderService,
  ) {}

  async getOrderById(
    input: GetOrderByIdInput,
    user: UserCon,
  ): Promise<GetOrderByIdItemOutput> {
    const result = await this._tryExecution(input, user);

    if (!result) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return result;
  }

  private async _tryExecution(
    input: GetOrderByIdInput,
    user: UserCon,
  ): Promise<GetOrderByIdItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const order = await this._orderRepository.findOne(input.orderId, {
        relations: [
          'billingAddress',
          'deliveryAddress',
          'voucher',
          'storagePoint',
          'transferts',
          'articleOrdereds',
          'orderProcessings',
          'purchaseOrder',
          'stockMovements',
          'productItems',
        ],
      });

      if (!order) {
        throw new NotFoundException(
          `Order with id '${input.orderId}' is not found`,
        );
      }

      const orderModel = await this._orderService.miniBuildOrderModel(order);

      return new GetOrderByIdItemOutput(orderModel, lang);
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetOrderByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
