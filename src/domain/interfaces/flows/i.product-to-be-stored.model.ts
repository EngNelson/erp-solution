import { ProductItem } from 'src/domain/entities/items';
import { ProductVariantItemDetails } from 'src/domain/types/catalog/items';

export interface ProductToBeStoredModel {
  variant: Partial<ProductVariantItemDetails>;
  productItems: ProductItem[];
  quantity: number;
}
