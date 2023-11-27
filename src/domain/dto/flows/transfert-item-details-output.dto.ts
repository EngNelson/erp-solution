import { getLangOrFirstAvailableValue, ISOLang } from '@glosuite/shared';
import {
  MobileUnitItemOutput,
  VariantsToTransfertOutput,
} from 'src/domain/dto/flows';
import { ExtraMiniOrderOutput } from 'src/domain/dto/orders';
import { ExtraMiniStoragePointOutput } from 'src/domain/dto/warehouses';
import { TransfertStatus, TransfertType } from 'src/domain/enums/flows';
import { TransfertModel } from 'src/domain/types/flows';
import { MiniUserOutput } from '../auth';
import { MiniTransfertOutputTransfertOutput } from './mini-transfert-output.dto';
import { CommentItemOutput } from '../comment-item-output.dto';
import { ExtraMiniPurchaseOrderOutput } from '../purchases';

export class TransfertItemDetailsOutput {
  constructor(transfertModel: TransfertModel, lang: ISOLang) {
    this.id = transfertModel.transfert.id;
    this.reference = transfertModel.transfert.reference;
    this.type = transfertModel.transfert.type;
    this.status = transfertModel.transfert.status;
    this.source = new ExtraMiniStoragePointOutput(
      transfertModel.transfert.source,
    );
    this.target = new ExtraMiniStoragePointOutput(
      transfertModel.transfert.target,
    );
    this.description = transfertModel.transfert.description
      ? getLangOrFirstAvailableValue(transfertModel.transfert.description, lang)
      : null;
    this.isRequest = transfertModel.transfert.isRequest;
    this.variantsToTransfert = transfertModel.variantsToTransfert.map(
      (variantToTransfert) =>
        new VariantsToTransfertOutput(variantToTransfert, lang),
    );
    this.comments = transfertModel.transfert.comments
      ? transfertModel.transfert.comments.map(
          (comment) => new CommentItemOutput(comment),
        )
      : [];
    this.parent = transfertModel.transfert.parent
      ? new MiniTransfertOutputTransfertOutput(
          transfertModel.transfert.parent,
          lang,
        )
      : null;
    this.child = transfertModel.transfert.child
      ? new MiniTransfertOutputTransfertOutput(
          transfertModel.transfert.child,
          lang,
        )
      : null;
    this.mobileUnits =
      transfertModel.mobileUnits && transfertModel.mobileUnits.length > 0
        ? transfertModel.mobileUnits.map(
            (mobileUnitModel) =>
              new MobileUnitItemOutput(mobileUnitModel, lang),
          )
        : [];
    this.numberOfPackages = transfertModel.transfert.mobileUnits
      ? transfertModel.transfert.mobileUnits.length
      : 0;
    this.order = transfertModel.transfert.order
      ? new ExtraMiniOrderOutput(transfertModel.transfert.order)
      : null;
    this.purchaseOrder = transfertModel.transfert.purchaseOrder
      ? new ExtraMiniPurchaseOrderOutput(transfertModel.transfert.purchaseOrder)
      : null;
    // this.pickingList = transfertModel.transfert.pickingList
    //   ? new MiniPickingListOutput(transfertModel.transfert.pickingList)
    //   : null;
    this.confirmedBy = transfertModel.transfert.confirmedBy
      ? new MiniUserOutput(transfertModel.transfert.confirmedBy)
      : null;
    this.confirmedAt = transfertModel.transfert.confirmedAt
      ? transfertModel.transfert.confirmedAt
      : null;
    this.validatedBy = transfertModel.transfert.validatedBy
      ? new MiniUserOutput(transfertModel.transfert.validatedBy)
      : null;
    this.validatedAt = transfertModel.transfert.validatedAt
      ? transfertModel.transfert.validatedAt
      : null;
    this.canceledBy = transfertModel.transfert.canceledBy
      ? new MiniUserOutput(transfertModel.transfert.canceledBy)
      : null;
    this.canceledAt = transfertModel.transfert.canceledAt
      ? transfertModel.transfert.canceledAt
      : null;
    this.createdAt = transfertModel.transfert.createdAt;
    this.lastUpdate = transfertModel.transfert.lastUpdate
      ? transfertModel.transfert.lastUpdate
      : null;
  }

  id: string;
  reference: string;
  type: TransfertType;
  status: TransfertStatus;
  source: ExtraMiniStoragePointOutput;
  target: ExtraMiniStoragePointOutput;
  description?: string;
  isRequest: boolean;
  variantsToTransfert: VariantsToTransfertOutput[];
  comments?: CommentItemOutput[];
  parent?: MiniTransfertOutputTransfertOutput;
  child?: MiniTransfertOutputTransfertOutput;
  mobileUnits?: MobileUnitItemOutput[];
  numberOfPackages?: number;
  order?: ExtraMiniOrderOutput;
  purchaseOrder?: ExtraMiniPurchaseOrderOutput;
  // pickingList?: MiniPickingListOutput;
  confirmedBy?: MiniUserOutput;
  confirmedAt?: Date;
  validatedBy?: MiniUserOutput;
  validatedAt?: Date;
  canceledBy?: MiniUserOutput;
  canceledAt?: Date;
  createdAt: Date;
  lastUpdate?: Date;
}
