import { VariantReception } from 'src/domain/entities/flows';
import { ProductVariantItemDetails } from '../catalog/items';

export interface VariantReceptionItemDetails {
  variantReception: VariantReception;
  variantItem: ProductVariantItemDetails;
}
