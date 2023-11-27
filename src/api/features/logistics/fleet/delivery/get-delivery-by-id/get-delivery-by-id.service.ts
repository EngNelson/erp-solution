import {
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
import { GetDeliveryByIdInput } from './dto';
type ValidationResult = {
  pagination: PaginationDto;
  // option?:GetDeliveriesOptionsDto ;
  lang?: ISOLang;
  user: UserCon;
};

@Injectable()
export class GetDeliveryByIdService {

  constructor(
    @InjectRepository(Delivery)
    private readonly _deliveryRepository: DeliveryRepository,
  ) { }


  async getDeliveryById(input: GetDeliveryByIdInput,
    user: UserCon) {

    try {

      const delivery = await this._deliveryRepository.findOne({
        where: {
          id: input.deliveryId
        }
      });

      if (!delivery){
        throw new HttpException(`Delivery with id ${input.deliveryId} not found`, HttpStatus.NOT_FOUND);
      }

      return delivery;
    } catch (error) {
      throw new HttpException(`Delivery with id ${input.deliveryId} not found`, HttpStatus.NOT_FOUND)
    }

  }

}

