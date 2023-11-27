import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  UserCon,
} from '@glosuite/shared';
import { GetDeliveryPointByIdInput } from './dto';
import { DeliveryPointRepository } from 'src/repositories/logistics/delivery-point.repository';
import { DeliveryPoint } from 'src/domain/entities/logistics/delivery-point.entity';


@Injectable()
export class GetDeliveryPointByIdService {

  constructor(
    @InjectRepository(DeliveryPoint)
    private readonly _deliveryPointRepository: DeliveryPointRepository,
  ) { }


  async getDeliveryPointById(input: GetDeliveryPointByIdInput,
    user: UserCon) {

    try {

      const delivery = await this._deliveryPointRepository.findOne({
        where: {
          id: input.deliveryPointId
        }
      });

      if (!delivery) {
        throw new HttpException(`Delivery with id ${input.deliveryPointId} not found`, HttpStatus.NOT_FOUND);
      }

      return delivery;
    } catch (error) {
      throw new HttpException(`Delivery with id ${input.deliveryPointId} not found`, HttpStatus.NOT_FOUND)
    }

  }

}

