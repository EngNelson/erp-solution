import { ProductVariant } from 'src/domain/entities/items';

export interface ProductVariantToOutputModel {
  article: ProductVariant;
  quantity: number;
}
