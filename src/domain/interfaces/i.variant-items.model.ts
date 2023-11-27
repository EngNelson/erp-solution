import { ProductVariant } from 'src/domain/entities/items';

export interface VariantItemsModel {
  variant: ProductVariant;
  quantity: number;
}
