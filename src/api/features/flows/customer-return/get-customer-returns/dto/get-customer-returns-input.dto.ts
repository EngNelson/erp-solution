import { PaginationInput } from '@glosuite/shared';
import { GetCustomerReturnsOptionsDto } from 'src/domain/dto/flows/get-custumer-return-options.dto';

export class GetCustomerReturnsInput {
  pagination: PaginationInput;
  options?: GetCustomerReturnsOptionsDto;
}
