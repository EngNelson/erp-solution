import { PaginationDto } from '@glosuite/shared';
import { GetReceptionsOptionsDto } from 'src/domain/dto/flows';

export class GetReceptionsInput {
  pagination: PaginationDto;
  options?: GetReceptionsOptionsDto;
}
