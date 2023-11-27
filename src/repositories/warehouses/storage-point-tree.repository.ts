import { StoragePoint } from 'src/domain/entities/warehouses';
import { EntityRepository, TreeRepository } from 'typeorm';

@EntityRepository(StoragePoint)
export class StoragePointTreeRepository extends TreeRepository<StoragePoint> {}
