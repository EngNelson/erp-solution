import { PaginationDto } from '@glosuite/shared';
import { GetAddressesOptionsInput } from 'src/domain/dto/shared';

export class GetAddressesInput {
  pagination?: PaginationDto;
  options?: GetAddressesOptionsInput;
}
