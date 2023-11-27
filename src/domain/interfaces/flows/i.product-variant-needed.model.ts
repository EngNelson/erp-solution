import { ProductVariant } from 'src/domain/entities/items';

export interface ProductVariantNeededModel {
  productVariant: ProductVariant;
  quantity: number;
}
