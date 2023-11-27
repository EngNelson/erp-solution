import { PaginationDto } from '@glosuite/shared';
import { GetCollectionsOptionsDto } from 'src/domain/dto/structures';

export class GetCollectionsInput {
  pagination: PaginationDto;

  options?: GetCollectionsOptionsDto;
}
