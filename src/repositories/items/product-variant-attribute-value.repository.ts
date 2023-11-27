import { ProductVariantAttributeValues } from 'src/domain/entities/items';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(ProductVariantAttributeValues)
export class ProductVariantAttributeValuesRepository<T> extends Repository<
  ProductVariantAttributeValues<T>
> {}
