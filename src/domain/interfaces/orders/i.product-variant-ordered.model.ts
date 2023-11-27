import { ProductVariant } from 'src/domain/entities/items';

export interface ProductVariantOrderedModel {
  article: ProductVariant;
  quantity: number;
  customPrice?: number;
  discount?: number;
}
