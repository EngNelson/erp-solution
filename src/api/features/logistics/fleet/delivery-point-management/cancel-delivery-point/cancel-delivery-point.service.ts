import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  UserCon,
} from '@glosuite/shared';
import { CancelDeliveryPointInput } from './dto/cancel-delivery-point-input.dto';
import { DeliveryPointRepository } from 'src/repositories/logistics/delivery-point.repository';
import { DeliveryPoint } from 'src/domain/entities/logistics/delivery-point.entity';


@Injectable()
export class CancelDeliveryPointService {

  constructor(
    @InjectRepository(DeliveryPoint)
    private readonly _deliveryPointRepository: DeliveryPointRepository,
  ) { }


  async cancelDeliveryPoint(input: CancelDeliveryPointInput,
    user: UserCon) {
    try {
      const deliveryPoint = await this._deliveryPointRepository.findOne({ where: { id: input.deliveryPointId } });
      if (!deliveryPoint) {
        throw new HttpException(`Delivery with id ${input.deliveryPointId} not found`, HttpStatus.NOT_FOUND);
      }
      await this._deliveryPointRepository.delete(input.deliveryPointId);
      return true;
    } catch (error) {
      throw new HttpException(`Delivery with id ${input.deliveryPointId} not found`, HttpStatus.NOT_FOUND)
    }
  }

}