import { VariantNeeded } from 'src/domain/entities/flows';
import { ProductVariant } from 'src/domain/entities/items';

export interface EditedVariantNeededModel {
  variantNeeded: VariantNeeded;
  position: number;
  productVariant: ProductVariant;
  newQuantity: number;
}
