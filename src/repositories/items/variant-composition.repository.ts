import { VariantComposition } from 'src/domain/entities/items';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(VariantComposition)
export class VariantCompositionRepository extends Repository<VariantComposition> {}
