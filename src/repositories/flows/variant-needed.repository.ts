import { VariantNeeded } from 'src/domain/entities/flows';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(VariantNeeded)
export class VariantNeededRepository extends Repository<VariantNeeded> {}
