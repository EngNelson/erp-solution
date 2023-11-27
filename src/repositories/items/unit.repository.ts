import { Unit } from 'src/domain/entities/items/eav';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(Unit)
export class UnitRepository extends Repository<Unit> {}
