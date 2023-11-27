import { VariantPurchased } from 'src/domain/entities/purchases';
import { ProductVariantItemDetails } from '../catalog/items';

export type VariantsToPurchaseModel = {
  variantPurchased: VariantPurchased;
  variantDetails: Partial<ProductVariantItemDetails>;
};
