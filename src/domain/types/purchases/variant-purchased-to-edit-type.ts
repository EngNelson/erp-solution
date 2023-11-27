import { PurchaseStatusLine } from 'src/domain/enums/purchases';

export type VariantPurchasedToEditType = {
  variantPurchasedId: string;
  purchaseCost?: number;
  realCost?: number;
  customPrice?: number;
  supplierId?: string;
  status?: PurchaseStatusLine;
  comment?: string;
};
