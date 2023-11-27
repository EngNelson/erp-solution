import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  UserCon,
} from '@glosuite/shared';
import { AddDeliveryPointInput } from './dto';
import { DeliveryPointRepository } from 'src/repositories/logistics/delivery-point.repository';
import { DeliveryPoint } from 'src/domain/entities/logistics/delivery-point.entity';


@Injectable()
export class AddDeliveryPointService {
  constructor(
    @InjectRepository(DeliveryPoint)
    private readonly _deliveryPointRepository: DeliveryPointRepository
  ) { }

  async addDeliveryPoint(
    input: AddDeliveryPointInput,
    user: UserCon,
    accessToken: string,
  ): Promise<any> {

    try {
      console.log(input);
      const savedDeliveryPoint = await this._deliveryPointRepository.save({
        deliveryPointAddress:input.deliveryPointAddress
      });
      return savedDeliveryPoint;
    } catch (error) {
      console.log("Error is ",error?.message);
      
      throw new HttpException("An unknown error occured ", HttpStatus.EXPECTATION_FAILED);
    }
  }

}
