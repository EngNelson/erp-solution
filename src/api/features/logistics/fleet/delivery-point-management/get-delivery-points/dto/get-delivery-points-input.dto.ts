import { PaginationDto } from '@glosuite/shared';
import { GetDeliveriesOptionsDto } from 'src/domain/dto/delivery/get-deliveries-options.dto';


export class GetDeliveryPointsInput {
  pagination: PaginationDto;
  options?: GetDeliveriesOptionsDto;
}
