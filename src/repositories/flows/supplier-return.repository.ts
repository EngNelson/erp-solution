import { SupplierReturn } from 'src/domain/entities/flows';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(SupplierReturn)
export class SupplierReturnRepository extends Repository<SupplierReturn> {}
