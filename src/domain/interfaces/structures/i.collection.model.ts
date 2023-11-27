import { Collection } from 'src/domain/entities/structures';
import { ProductVariantItemDetails } from 'src/domain/types/catalog/items';

export interface CollectionModel {
  collection: Collection;
  articles: Partial<ProductVariantItemDetails>[];
}
