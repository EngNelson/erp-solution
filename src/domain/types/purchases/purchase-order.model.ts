import { PurchaseOrder } from 'src/domain/entities/purchases';
import { VariantsToPurchaseModel } from './variants-to-purchase-order.model';

export type PurchaseOrderModel = {
  purchaseOrder: PurchaseOrder;
  variantsToPurchase: VariantsToPurchaseModel[];
};
