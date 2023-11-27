import { ProductItem, ProductVariant } from 'src/domain/entities/items';

export interface VariantReceivedModel {
  variant: ProductVariant;
  productItems: ProductItem[];
}
