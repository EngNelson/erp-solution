import { Address } from 'src/domain/entities/shared';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(Address)
export class AddressRepository extends Repository<Address> {}
