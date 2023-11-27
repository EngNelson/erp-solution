import { Location } from 'src/domain/entities/warehouses';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(Location)
export class LocationRepository extends Repository<Location> {}
