import { VariantPurchased } from 'src/domain/entities/purchases';
import { ProductVariantItemDetails } from '../catalog/items';

export interface VariantPurchasedItemDetails {
  variantPurchased: VariantPurchased;
  variantItem: ProductVariantItemDetails;
}
