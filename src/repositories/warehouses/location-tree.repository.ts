import { Location } from 'src/domain/entities/warehouses';
import { EntityRepository, TreeRepository } from 'typeorm';

@EntityRepository(Location)
export class LocationTreeRepository extends TreeRepository<Location> {}
