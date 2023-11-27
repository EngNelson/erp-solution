import { PaginationDto } from '@glosuite/shared';
import { GetTransfertsOptionsDto } from 'src/domain/dto/flows';

export class GetTransfertsInput {
  pagination: PaginationDto;
  options?: GetTransfertsOptionsDto;
}
