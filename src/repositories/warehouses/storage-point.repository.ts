import { StoragePoint } from 'src/domain/entities/warehouses';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(StoragePoint)
export class StoragePointRepository extends Repository<StoragePoint> {}
