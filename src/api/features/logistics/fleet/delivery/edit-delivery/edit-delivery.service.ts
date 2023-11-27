import {
  Get,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ISOLang,
  PaginationDto,
  UserCon,
} from '@glosuite/shared';
import { Delivery } from 'src/domain/entities/logistics';
import { DeliveryRepository } from 'src/repositories/logistics';
import { GetDeliveriesOptionsDto } from 'src/domain/dto/delivery/get-deliveries-options.dto';
import { EditDeliveriesInput } from './dto';

type ValidationResult = {
  pagination: PaginationDto;
  option?: GetDeliveriesOptionsDto;
  lang?: ISOLang;
  user: UserCon;
};

@Injectable()
export class EditDeliveriesService {

  constructor(
    @InjectRepository(Delivery)
    private readonly _deliveryRepository: DeliveryRepository,
  ) { }
  @Get()
  async editDelivery(input: EditDeliveriesInput,
    user: UserCon,) {

    try {
      const delivery = await this._deliveryRepository.findOne({ where: { id: input.deliveryId } });
      if (!delivery) {
        throw new HttpException(`Delivery with id ${input.deliveryId} not found`, HttpStatus.NOT_FOUND);
      }

      const updatedDelivery = {
        ...input,
        ...delivery
      };

      const updatedResult = await this._deliveryRepository.update(input.deliveryId, updatedDelivery);

      return updatedResult;
    } catch (error) {
      throw new HttpException("Update failed", HttpStatus.EXPECTATION_FAILED);
    }

  }

}