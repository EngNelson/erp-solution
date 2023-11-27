import { PaginationDto } from '@glosuite/shared';
import { GetInvestigationsOptionsDto } from 'src/domain/dto/flows';

export class GetInvestigationsInput {
  pagination: PaginationDto;
  options?: GetInvestigationsOptionsDto;
}
