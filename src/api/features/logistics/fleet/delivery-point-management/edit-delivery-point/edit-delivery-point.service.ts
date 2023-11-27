import {
  Get,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  UserCon,
} from '@glosuite/shared';
import { EditDeliveryPointInput } from './dto/edit-delivery-point-input.dto';
import { DeliveryPointRepository } from 'src/repositories/logistics/delivery-point.repository';
import { DeliveryPoint } from 'src/domain/entities/logistics/delivery-point.entity';


@Injectable()
export class EditDeliveryPointService {

  constructor(
    @InjectRepository(DeliveryPoint)
    private readonly _deliveryPointRepository: DeliveryPointRepository,
  ) { }
  @Get()
  async editDeliveryPoint(input: EditDeliveryPointInput,
    user: UserCon,) {

    try {
      const deliveryPoint = await this._deliveryPointRepository.findOne({ where: { id: input.deliveryPointId } });
      if (!deliveryPoint) {
        throw new HttpException(`Delivery with id ${input.deliveryPointId} not found`, HttpStatus.NOT_FOUND);
      }

      const updatedDeliveryPoint = {
        ...input,
        ...deliveryPoint
      };

      const updatedResult = await this._deliveryPointRepository.update(input.deliveryPointId, updatedDeliveryPoint);

      return updatedResult;
    } catch (error) {
      throw new HttpException("Update failed", HttpStatus.EXPECTATION_FAILED);
    }

  }

}