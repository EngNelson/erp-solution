import { ISOLang } from '@glosuite/shared';
import { OperationStatus } from 'src/domain/enums/flows';
import { PurchaseOrderFor, PurchaseType } from 'src/domain/enums/purchases';
import { MiniUserPayload } from 'src/domain/interfaces';
import { PurchaseOrderModel } from 'src/domain/types/purchases';
import { MiniUserOutput } from '../auth';
import {
  ExtraMiniTransfertOutput,
  MiniInternalNeedOutput,
  MiniReceptionOutput,
} from '../flows';
import { ExtraMiniOrderOutput, MiniOrderOutput } from '../orders';
import { ExtraMiniStoragePointOutput } from '../warehouses';
import { MiniPurchaseOrderOutput } from './mini-purchase-order-output.dto';
import { VariantsToPurchaseOutput } from './variants-to-purchase-output.dto';
import { CommentItemOutput } from '../comment-item-output.dto';

export class PurchaseOrderItemOutput {
  constructor(purchaseOrderModel: PurchaseOrderModel, lang: ISOLang) {
    this.id = purchaseOrderModel.purchaseOrder.id;
    this.reference = purchaseOrderModel.purchaseOrder.reference;
    this.type = purchaseOrderModel.purchaseOrder.type;
    this.status = purchaseOrderModel.purchaseOrder.status;
    this.assignedTo = purchaseOrderModel.purchaseOrder.assignTo
      ? purchaseOrderModel.purchaseOrder.assignedTo
      : null;
    this.purchaseFor = purchaseOrderModel.purchaseOrder.purchaseFor;
    this.child = purchaseOrderModel.purchaseOrder.child
      ? new MiniPurchaseOrderOutput(
          purchaseOrderModel.purchaseOrder.child,
          lang,
        )
      : null;
    this.parent = purchaseOrderModel.purchaseOrder.parent
      ? new MiniPurchaseOrderOutput(
          purchaseOrderModel.purchaseOrder.parent,
          lang,
        )
      : null;
    this.order = purchaseOrderModel.purchaseOrder.order
      ? new ExtraMiniOrderOutput(purchaseOrderModel.purchaseOrder.order)
      : null;
    this.orderRef = purchaseOrderModel.purchaseOrder.orderRef
      ? purchaseOrderModel.purchaseOrder.orderRef
      : null;
    this.transfert = purchaseOrderModel.purchaseOrder.transfert
      ? new ExtraMiniTransfertOutput(purchaseOrderModel.purchaseOrder.transfert)
      : null;
    this.internalNeed = purchaseOrderModel.purchaseOrder.internalNeed
      ? new MiniInternalNeedOutput(
          purchaseOrderModel.purchaseOrder.internalNeed,
        )
      : null;
    this.storagePoint = purchaseOrderModel.purchaseOrder.storagePoint
      ? new ExtraMiniStoragePointOutput(
          purchaseOrderModel.purchaseOrder.storagePoint,
        )
      : null;
    this.variantsToPurchase = purchaseOrderModel.variantsToPurchase.map(
      (variantToPurchase) =>
        new VariantsToPurchaseOutput(variantToPurchase, lang),
    );
    this.comments = purchaseOrderModel.purchaseOrder.comments
      ? purchaseOrderModel.purchaseOrder.comments.map(
          (comment) => new CommentItemOutput(comment),
        )
      : [];
    this.createdBy = purchaseOrderModel.purchaseOrder.createdBy
      ? new MiniUserOutput(purchaseOrderModel.purchaseOrder.createdBy)
      : null;
    this.createdAt = purchaseOrderModel.purchaseOrder.createdAt;
    this.validatedBy = purchaseOrderModel.purchaseOrder.validatedBy
      ? new MiniUserOutput(purchaseOrderModel.purchaseOrder.validatedBy)
      : null;
    this.validatedAt = purchaseOrderModel.purchaseOrder.validatedAt
      ? purchaseOrderModel.purchaseOrder.validatedAt
      : null;
    this.receptions = purchaseOrderModel.purchaseOrder.receptions
      ? purchaseOrderModel.purchaseOrder.receptions.map(
          (reception) => new MiniReceptionOutput(reception),
        )
      : [];
    this.canceledBy = purchaseOrderModel.purchaseOrder.canceledBy
      ? new MiniUserOutput(purchaseOrderModel.purchaseOrder.canceledBy)
      : null;
    this.canceledAt = purchaseOrderModel.purchaseOrder.canceledAt
      ? purchaseOrderModel.purchaseOrder.canceledAt
      : null;
    this.updatedBy = purchaseOrderModel.purchaseOrder.updatedBy
      ? new MiniUserOutput(purchaseOrderModel.purchaseOrder.updatedBy)
      : null;
  }

  id: string;
  reference: string;
  type: PurchaseType;
  status: OperationStatus;
  assignedTo?: MiniUserPayload;
  purchaseFor: PurchaseOrderFor;
  child?: MiniPurchaseOrderOutput;
  parent?: MiniPurchaseOrderOutput;
  order?: ExtraMiniOrderOutput;
  orderRef?: string;
  transfert?: ExtraMiniTransfertOutput;
  internalNeed?: MiniInternalNeedOutput;
  storagePoint: ExtraMiniStoragePointOutput;
  variantsToPurchase: VariantsToPurchaseOutput[];
  comments?: CommentItemOutput[];
  createdBy?: MiniUserOutput;
  createdAt: Date;
  validatedBy?: MiniUserOutput;
  validatedAt?: Date;
  receptions?: MiniReceptionOutput[];
  canceledBy?: MiniUserOutput;
  canceledAt?: Date;
  updatedBy?: MiniUserOutput;
}
