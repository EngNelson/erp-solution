import { ProductVariant } from '../entities/items';

export interface ProductVariantToTransfertModel {
  productVariant: ProductVariant;
  quantity: number;
}
