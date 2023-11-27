import { PaginationDto } from '@glosuite/shared';
import { GetOrdersOptionsDto } from 'src/domain/dto/orders/get-orders-options.dto';

export class GetOrdersInput {
  pagination: PaginationDto;
  options?: GetOrdersOptionsDto;
}
