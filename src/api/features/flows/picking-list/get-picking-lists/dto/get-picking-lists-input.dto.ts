import { PaginationDto } from '@glosuite/shared';
import { GetPickingListsOptionsDto } from 'src/domain/dto/flows';

export class GetPickingListsInput {
  pagination: PaginationDto;
  options?: GetPickingListsOptionsDto;
}
