import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  UserCon,
} from '@glosuite/shared';
import { Delivery } from 'src/domain/entities/logistics';
import { DeliveryRepository } from 'src/repositories/logistics';
import { CancelDeliveryInput } from './dto/cancel-delivery-input.dto';


@Injectable()
export class CancelDeliveryService {

  constructor(
    @InjectRepository(Delivery)
    private readonly _deliveryRepository: DeliveryRepository,
  ) { }


  async cancelDelivery(input: CancelDeliveryInput,
    user: UserCon) {
    try {
      const foundDelivery = await this._deliveryRepository.findOne({ where: { id: input.deliveryId } });
      if (!foundDelivery) {
        throw new HttpException(`Delivery with id ${input.deliveryId} not found`, HttpStatus.NOT_FOUND);
      }
      await this._deliveryRepository.delete(input.deliveryId);
      return true;
    } catch (error) {
      throw new HttpException(`Delivery with id ${input.deliveryId} not found`, HttpStatus.NOT_FOUND)
    }
  }

}



