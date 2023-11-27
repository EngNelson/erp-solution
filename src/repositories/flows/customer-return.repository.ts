import { CustomerReturn } from 'src/domain/entities/flows';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(CustomerReturn)
export class CustomerReturnRepository extends Repository<CustomerReturn> {}
