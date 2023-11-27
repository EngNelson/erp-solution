import { ProductItem } from 'src/domain/entities/items';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(ProductItem)
export class ProductItemRepository extends Repository<ProductItem> {}
