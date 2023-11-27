import { InternalNeed } from 'src/domain/entities/flows';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(InternalNeed)
export class InternalNeedRepository extends Repository<InternalNeed> {}
