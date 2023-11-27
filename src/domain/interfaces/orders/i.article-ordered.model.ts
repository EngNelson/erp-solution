import { ProductItem } from 'src/domain/entities/items';
import { ArticleOrdered } from 'src/domain/entities/orders';
import { ProductVariantItemDetails } from 'src/domain/types/catalog/items';

export interface ArticleOrderedModel {
  articleOrdered: ArticleOrdered;
  quantity: number;
  productItems: ProductItem[];
  variant: Partial<ProductVariantItemDetails>;
}
