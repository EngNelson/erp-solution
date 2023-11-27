import { ArticleOrdered } from 'src/domain/entities/orders';
import { ProductVariantItemDetails } from 'src/domain/types/catalog/items';

export interface ArticleOrderedItemDetails {
  articleOrdered: ArticleOrdered;
  articleItem: ProductVariantItemDetails;
}
