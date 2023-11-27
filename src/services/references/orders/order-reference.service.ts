import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderProcessing } from 'src/domain/entities/flows';
import { Order } from 'src/domain/entities/orders';
import { OrderSource, OrderVersion } from 'src/domain/enums/orders';
import { OrderProcessingRepository } from 'src/repositories/flows';
import { OrderRepository } from 'src/repositories/orders';
import { SharedService } from 'src/services/utilities';

@Injectable()
export class OrderReferenceService {
  constructor(
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(OrderProcessing)
    private readonly _orderProcessingRepository: OrderProcessingRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async generate(
    source: OrderSource,
    parent?: Order,
    isChild?: boolean,
  ): Promise<string> {
    try {
      let reference: string;

      if (isChild) {
        reference = `${parent.reference}-1`;
      } else {
        const position = await this._getOrderPosition(source);

        if (source === OrderSource.CUSTOMER_RETURN) {
          const suffix = await this._sharedService.generateSuffix(position, 2);

          reference = `${parent.reference}-SAV${suffix}`;
        }

        if (source === OrderSource.DEAD_LOCATION) {
          const suffix = await this._sharedService.generateSuffix(position, 5);
          reference = `DEAD-O${suffix}`;
        }

        if (source === OrderSource.DESTOCKAGE) {
          const suffix = await this._sharedService.generateSuffix(position, 6);
          reference = `DESCTOK${suffix}`;
        }

        if (
          source === OrderSource.PUS_PICK_AND_COLLECT ||
          source === OrderSource.FLEET ||
          source === OrderSource.PUS ||
          source === OrderSource.EXPEDITION
        ) {
          const suffix = await this._sharedService.generateSuffix(position, 9);
          reference = `O${suffix}`;
        }
      }

      return reference;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        `An error occured while generating reference` + error.message,
      );
    }
  }

  private async _getOrderPosition(source: OrderSource): Promise<number> {
    let [orders, count] = [[], 0];

    if (
      source === OrderSource.PUS_PICK_AND_COLLECT ||
      source === OrderSource.FLEET ||
      source === OrderSource.PUS ||
      source === OrderSource.EXPEDITION
    ) {
      [orders, count] = await this._orderRepository.findAndCount({
        where: [
          { orderSource: OrderSource.PUS },
          { orderSource: OrderSource.FLEET },
          { orderSource: OrderSource.PUS_PICK_AND_COLLECT },
          { orderSource: OrderSource.EXPEDITION },
        ],
        withDeleted: true,
      });
    } else {
      [orders, count] = await this._orderRepository.findAndCount({
        where: { orderSource: source },
        withDeleted: true,
      });
    }

    return count + 1;
  }

  async generateOrderProcessingReference(order: Order): Promise<string> {
    try {
      const [steps, count] = await this._orderProcessingRepository.findAndCount(
        {
          where: { orderId: order.id },
        },
      );

      const suffix = await this._sharedService.generateSuffix(count + 1, 2);
      const reference = `${order.reference}-STEP${suffix}`;

      return reference;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        `An error occured while generating reference` + error.message,
      );
    }
  }

  async generateVersionRef(order: Order): Promise<string> {
    const previous = await this._orderRepository.find({
      where: { version: OrderVersion.PREVIOUS, sourceId: order.id },
    });
    const versionMums: number[] = [];
    let lastVersionNum = 0;
    if (previous && previous.length > 0) {
      previous.forEach((item) => {
        const parts = item.reference.split('-');
        const num = parts[1].replace('v', '');
        versionMums.push(parseInt(num));
      });
      lastVersionNum = Math.max(...versionMums);
    }
    const reference = `${order.reference}-v${lastVersionNum + 1}`;

    return reference;
  }
}
