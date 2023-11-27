import { ProductVariant } from 'src/domain/entities/items';
import { Supplier } from 'src/domain/entities/purchases';

export interface ProductVariantToPurchaseModel {
  productVariant: ProductVariant;
  quantity: number;
  purchaseCost: number;
  customPrice?: number;
  supplier?: Supplier;
}
