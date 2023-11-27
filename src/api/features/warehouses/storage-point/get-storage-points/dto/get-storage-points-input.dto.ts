import { PaginationDto } from '@glosuite/shared';
import { GetStoragePointsOptionsDto } from 'src/domain/dto/warehouses';

export class GetStoragePointsInput {
  pagination: PaginationDto;

  options?: GetStoragePointsOptionsDto;
}
