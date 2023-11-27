import { Supplier, VariantPurchased } from 'src/domain/entities/purchases';
import { PurchaseStatusLine } from 'src/domain/enums/purchases';

export interface VariantPurchasedToEditModel {
  variantPurchased: VariantPurchased;
  purchaseCost?: number;
  realCost?: number;
  customPrice?: number;
  supplier?: Supplier;
  status?: PurchaseStatusLine;
  comment?: string;
}
