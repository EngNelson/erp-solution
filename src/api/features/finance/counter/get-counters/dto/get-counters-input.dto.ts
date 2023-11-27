import { PaginationDto } from '@glosuite/shared';
import { GetCountersOptionsDto } from 'src/domain/dto/finance/counter';

export class GetCountersInput {
  pagination: PaginationDto;
  options?: GetCountersOptionsDto;
}
