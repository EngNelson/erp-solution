import {
  Get,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  UserCon,
} from '@glosuite/shared';
import { GetDeliveryPointsInput } from './dto';
import { DeliveryPointRepository } from 'src/repositories/logistics/delivery-point.repository';
import { DeliveryPoint } from 'src/domain/entities/logistics/delivery-point.entity';



@Injectable()
export class GetDeliveryPointsService {

  constructor(
    @InjectRepository(DeliveryPoint)
    private readonly _deliveryPointRepository: DeliveryPointRepository,
  ) { }
  @Get()
  async getDeliveryPoints(input: GetDeliveryPointsInput,
    user: UserCon,) {

    try {
      const deliveryPoints = await this._deliveryPointRepository.find();

      return deliveryPoints;
    } catch (error) {
      console.log("Error occured");

    }

  }

}
