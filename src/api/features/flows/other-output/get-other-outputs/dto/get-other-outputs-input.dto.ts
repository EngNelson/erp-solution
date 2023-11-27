import { PaginationDto } from '@glosuite/shared';
import { GetOtherOutputsOptionsDto } from 'src/domain/dto/flows';

export class GetOtherOutputsInput {
  pagination: PaginationDto;
  options?: GetOtherOutputsOptionsDto;
}
