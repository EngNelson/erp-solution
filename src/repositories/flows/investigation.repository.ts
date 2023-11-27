import { Investigation } from 'src/domain/entities/flows';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(Investigation)
export class InvestigationRepository extends Repository<Investigation> {}
