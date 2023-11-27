import { ProductVariant } from 'src/domain/entities/items';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(ProductVariant)
export class ProductVariantRepository extends Repository<ProductVariant> {}
