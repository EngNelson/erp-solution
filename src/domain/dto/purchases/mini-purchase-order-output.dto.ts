import { ISOLang } from '@glosuite/shared';
import { PurchaseOrder } from 'src/domain/entities/purchases';
import { OperationStatus } from 'src/domain/enums/flows';
import { PurchaseOrderFor, PurchaseType } from 'src/domain/enums/purchases';
import { MiniUserOutput } from '../auth';
import {
  ExtraMiniInternalNeedOutput,
  ExtraMiniTransfertOutput,
} from '../flows';
import { ExtraMiniOrderOutput } from '../orders';
import { ExtraMiniStoragePointOutput } from '../warehouses';
import { CommentModel } from 'src/domain/interfaces';

export class MiniPurchaseOrderOutput {
  constructor(purchaseOrder: PurchaseOrder, lang: ISOLang) {
    this.id = purchaseOrder.id;
    this.reference = purchaseOrder.reference;
    this.type = purchaseOrder.type;
    this.purchaseFor = purchaseOrder.purchaseFor;
    this.status = purchaseOrder.status;
    this.storagePoint = purchaseOrder.storagePoint
      ? new ExtraMiniStoragePointOutput(purchaseOrder.storagePoint)
      : null;
    this.comments = purchaseOrder.comments;
    // this.child =
    //   isList && purchaseOrder.child
    //     ? new ExtraMiniPurchaseOrderOutput(purchaseOrder.child)
    //     : null;
    this.order = purchaseOrder.order
      ? new ExtraMiniOrderOutput(purchaseOrder.order)
      : null;
    this.orderRef = purchaseOrder.orderRef ? purchaseOrder.orderRef : null;
    this.transfert = purchaseOrder.transfert
      ? new ExtraMiniTransfertOutput(purchaseOrder.transfert)
      : null;
    this.internalNeed = purchaseOrder.internalNeed
      ? new ExtraMiniInternalNeedOutput(purchaseOrder.internalNeed)
      : null;
    this.createdBy = purchaseOrder.createdBy
      ? new MiniUserOutput(purchaseOrder.createdBy)
      : null;
    this.createdAt = purchaseOrder.createdAt;
    this.validatedAt = purchaseOrder.validatedAt
      ? purchaseOrder.validatedAt
      : null;
  }

  id: string;
  reference: string;
  type: PurchaseType;
  purchaseFor: PurchaseOrderFor;
  status: OperationStatus;
  storagePoint: ExtraMiniStoragePointOutput;
  comments?: CommentModel[];
  // child?: ExtraMiniPurchaseOrderOutput;
  order?: ExtraMiniOrderOutput;
  orderRef?: string;
  transfert?: ExtraMiniTransfertOutput;
  internalNeed?: ExtraMiniInternalNeedOutput;
  createdBy?: MiniUserOutput;
  createdAt: Date;
  validatedAt?: Date;
}
