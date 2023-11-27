import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from 'src/domain/entities/orders';
import { OrderRepository } from 'src/repositories/orders';
import { OrderService } from 'src/services/generals';
import { GetOrderByBarcodeInput, GetOrderByBarcodeOutput } from './dto';
import { BooleanValues, ISOLang, UserCon } from '@glosuite/shared';
import { OrderItemOutput } from 'src/domain/dto/orders';

@Injectable()
export class GetOrderByBarcodeService {
  constructor(
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    private readonly _orderService: OrderService,
  ) {}

  async getOrderByBarcode(
    input: GetOrderByBarcodeInput,
    user: UserCon,
  ): Promise<GetOrderByBarcodeOutput | OrderItemOutput> {
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
    input: GetOrderByBarcodeInput,
    user: UserCon,
  ): Promise<GetOrderByBarcodeOutput | OrderItemOutput> {
    try {
      const { barcode, options } = input;
      const lang = options.lang
        ? options.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      let order: Order;

      if (options.withDetails === BooleanValues.TRUE) {
        order = await this._orderRepository.findOne({
          where: { barcode: barcode },
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
            `Order with barcode '${barcode}' is not found`,
          );
        }

        const orderModel = await this._orderService.buildOrderModel(order);

        return new OrderItemOutput(orderModel, lang);
      } else {
        order = await this._orderRepository.findOne({
          where: { barcode: barcode },
          relations: ['articleOrdereds'],
        });

        if (!order) {
          throw new NotFoundException(
            `Order with barcode '${barcode}' is not found`,
          );
        }

        const items: number[] = [];
        order.articleOrdereds.forEach((articleOrdered) => {
          items.push(articleOrdered.quantity);
        });

        const totalItems = items.reduce((sum, i) => sum + i, 0);

        return new GetOrderByBarcodeOutput(order, totalItems);
      }
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetOrderByBarcodeService.name} - ${this._tryExecution.name} - `,
        error.message ? error.message : error,
      );
    }
  }
}
