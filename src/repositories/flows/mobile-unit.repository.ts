import { MobileUnit } from 'src/domain/entities/flows';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(MobileUnit)
export class MobileUnitRepository extends Repository<MobileUnit> {}
