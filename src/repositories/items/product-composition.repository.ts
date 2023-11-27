import { ProductComposition } from 'src/domain/entities/items';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(ProductComposition)
export class ProductCompositionRepository extends Repository<ProductComposition> {}
