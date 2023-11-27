import { ISOLang } from '@glosuite/shared';
import { OperationStatus, ReceptionType } from 'src/domain/enums/flows';
import { ReceptionModel } from 'src/domain/types/flows';
import { MiniUserOutput } from '../auth';
import { ProductItemWithVariantOutput } from '../items';
import { ExtraMiniOrderOutput } from '../orders';
import { MiniPurchaseOrderOutput } from '../purchases';
import { ExtraMiniStoragePointOutput } from '../warehouses';
import { MiniInternalNeedOutput } from './mini-internal-need-output.dto';
import { MiniReceptionOutput } from './mini-reception-output.dto';
import { ExtraMiniTransfertOutput } from './mini-transfert-output.dto';
import { MobileUnitItemOutput } from './mobile-unit-item-output.dto';
import { VariantsToReceivedOutput } from './variants-to-received-output.dto';
import { CommentItemOutput } from '../comment-item-output.dto';

export class ReceptionItemOutput {
  constructor(receptionModel: ReceptionModel, lang: ISOLang) {
    this.id = receptionModel.reception.id;
    this.reference = receptionModel.reception.reference;
    this.type = receptionModel.reception.type;
    this.status = receptionModel.reception.status;
    this.cancelReason = receptionModel.reception.cancelReason
      ? receptionModel.reception.cancelReason
      : null;
    this.child = receptionModel.reception.child
      ? new MiniReceptionOutput(receptionModel.reception.child)
      : null;
    this.parent = receptionModel.reception.parent
      ? new MiniReceptionOutput(receptionModel.reception.parent)
      : null;
    this.storagePoint = new ExtraMiniStoragePointOutput(
      receptionModel.reception.storagePoint,
    );
    this.purchaseOrder = receptionModel.reception.purchaseOrder
      ? new MiniPurchaseOrderOutput(
          receptionModel.reception.purchaseOrder,
          lang,
        )
      : null;
    this.order = receptionModel.reception.order
      ? new ExtraMiniOrderOutput(receptionModel.reception.order)
      : receptionModel.reception.purchaseOrder?.order
      ? new ExtraMiniOrderOutput(receptionModel.reception.purchaseOrder.order)
      : null;
    this.orderRef = receptionModel.reception.purchaseOrder?.orderRef
      ? receptionModel.reception.purchaseOrder.orderRef
      : receptionModel.reception.order
      ? receptionModel.reception.order.reference
      : null;
    this.transfert = receptionModel.transfert
      ? new ExtraMiniTransfertOutput(receptionModel.transfert)
      : null;
    this.internalNeed = receptionModel.reception.purchaseOrder?.internalNeed
      ? new MiniInternalNeedOutput(
          receptionModel.reception.purchaseOrder.internalNeed,
        )
      : null;
    this.variantReceptions = receptionModel.variantsToReceived
      ? receptionModel.variantsToReceived.map(
          (variantToReceived) =>
            new VariantsToReceivedOutput(variantToReceived, lang),
        )
      : [];
    this.mobileUnits =
      receptionModel.mobileUnits.length > 0
        ? receptionModel.mobileUnits.map(
            (mobileUnitModel) =>
              new MobileUnitItemOutput(mobileUnitModel, lang),
          )
        : [];
    this.productItems = receptionModel.reception.productItems
      ? receptionModel.reception.productItems.map(
          (item) => new ProductItemWithVariantOutput(item, lang),
        )
      : [];
    this.comments = receptionModel.reception.comments
      ? receptionModel.reception.comments.map(
          (comment) => new CommentItemOutput(comment),
        )
      : [];
    this.createdBy = receptionModel.reception.createdBy
      ? new MiniUserOutput(receptionModel.reception.createdBy)
      : null;
    this.createdAt = receptionModel.reception.createdAt;
    this.validatedBy = receptionModel.reception.validatedBy
      ? new MiniUserOutput(receptionModel.reception.validatedBy)
      : null;
    this.validatedAt = receptionModel.reception.validatedAt
      ? receptionModel.reception.validatedAt
      : null;
    this.canceledBy = receptionModel.reception.canceledBy
      ? new MiniUserOutput(receptionModel.reception.canceledBy)
      : null;
    this.canceledAt = receptionModel.reception.canceledAt
      ? receptionModel.reception.canceledAt
      : null;
    this.lastUpdate = receptionModel.reception.lastUpdate
      ? receptionModel.reception.lastUpdate
      : null;
  }

  id: string;
  reference: string;
  type: ReceptionType;
  status: OperationStatus;
  cancelReason?: string;
  child?: MiniReceptionOutput;
  parent?: MiniReceptionOutput;
  storagePoint: ExtraMiniStoragePointOutput;
  purchaseOrder?: MiniPurchaseOrderOutput;
  order?: ExtraMiniOrderOutput;
  orderRef?: string;
  transfert?: ExtraMiniTransfertOutput;
  internalNeed?: MiniInternalNeedOutput;
  variantReceptions?: VariantsToReceivedOutput[];
  mobileUnits?: MobileUnitItemOutput[];
  productItems?: ProductItemWithVariantOutput[];
  comments?: CommentItemOutput[];
  createdBy?: MiniUserOutput;
  createdAt: Date;
  validatedBy?: MiniUserOutput;
  validatedAt?: Date;
  canceledBy?: MiniUserOutput;
  canceledAt?: Date;
  lastUpdate?: Date;
}
