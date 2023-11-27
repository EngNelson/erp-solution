import { PurchaseOrder } from 'src/domain/entities/purchases';
import { OperationStatus } from 'src/domain/enums/flows';

export class ExtraMiniPurchaseOrderOutput {
  constructor(purchaseOrder: PurchaseOrder) {
    this.id = purchaseOrder.id;
    this.reference = purchaseOrder.reference;
    this.status = purchaseOrder.status;
  }

  id: string;
  reference: string;
  status: OperationStatus;
}
