import { Area } from 'src/domain/entities/warehouses';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(Area)
export class AreaRepository extends Repository<Area> {}
