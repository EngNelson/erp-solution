import { Supplier } from 'src/domain/entities/purchases';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(Supplier)
export class SupplierRepository extends Repository<Supplier> {}
