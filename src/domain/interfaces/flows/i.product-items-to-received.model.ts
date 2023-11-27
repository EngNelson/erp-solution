import { ProductItem, ProductVariant } from 'src/domain/entities/items';

export interface ProductItemsToReceivedModel {
  variant: ProductVariant;
  receivedItems: ProductItem[];
}
