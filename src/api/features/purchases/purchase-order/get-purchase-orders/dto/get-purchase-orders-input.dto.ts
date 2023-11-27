import { PaginationDto } from '@glosuite/shared';
import { GetPurchaseOrdersOptionsDto } from 'src/domain/dto/purchases';

export class GetPurchaseOrdersInput {
  pagination: PaginationDto;
  options?: GetPurchaseOrdersOptionsDto;
}
