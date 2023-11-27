import { ISOLang } from '@glosuite/shared';
import { OutputStatus, OutputType } from 'src/domain/enums/flows';
import { OtherOutputModel } from 'src/domain/interfaces/flows';
import { MiniUserOutput } from '../auth';
import { CommentItemOutput } from '../comment-item-output.dto';
import { ProductItemItemOutput } from '../items';
import { ExtraMiniStoragePointOutput } from '../warehouses';
import { ExtraMiniStockMovementOutput } from './extra-mini-stock-movement-output.dto';
import { MiniOtherOutputOutput } from './mini-other-output-output.dto';
import { VariantToOutputOutput } from './variant-to-output-output.dto';

export class OtherOutputItemOutput {
  constructor(otherOutputModel: OtherOutputModel, lang: ISOLang) {
    this.id = otherOutputModel.otherOutput.id;
    this.barcode = otherOutputModel.otherOutput.barcode;
    this.reference = otherOutputModel.otherOutput.reference;
    this.outputType = otherOutputModel.otherOutput.outputType;
    this.magentoOrderID = otherOutputModel.otherOutput.magentoOrderID
      ? otherOutputModel.otherOutput.magentoOrderID
      : null;
    this.status = otherOutputModel.otherOutput.status;
    this.child = otherOutputModel.otherOutput.child
      ? new MiniOtherOutputOutput(otherOutputModel.otherOutput.child)
      : null;
    this.parent = otherOutputModel.otherOutput.parent
      ? new MiniOtherOutputOutput(otherOutputModel.otherOutput.parent)
      : null;
    this.storagePoint = otherOutputModel.otherOutput.storagePoint
      ? new ExtraMiniStoragePointOutput(
          otherOutputModel.otherOutput.storagePoint,
        )
      : null;
    this.variantsToOutput = otherOutputModel.variantsToOutput.map(
      (variantToOutput) => new VariantToOutputOutput(variantToOutput, lang),
    );
    this.comments = otherOutputModel.otherOutput.comments
      ? otherOutputModel.otherOutput.comments.map(
          (comment) => new CommentItemOutput(comment),
        )
      : [];
    this.productItems = otherOutputModel.otherOutput.productItems
      ? otherOutputModel.otherOutput.productItems.map(
          (productItem) => new ProductItemItemOutput(productItem, lang),
        )
      : [];
    this.stockMovements = otherOutputModel.otherOutput.stockMovements
      ? otherOutputModel.otherOutput.stockMovements.map(
          (stockeMovement) => new ExtraMiniStockMovementOutput(stockeMovement),
        )
      : [];
    this.createdAt = otherOutputModel.otherOutput.createdAt;
    this.createdBy = otherOutputModel.otherOutput.createdBy
      ? new MiniUserOutput(otherOutputModel.otherOutput.createdBy)
      : null;
    this.lastUpdate = otherOutputModel.otherOutput.lastUpdate;
    this.validatedAt = otherOutputModel.otherOutput.validatedAt
      ? otherOutputModel.otherOutput.validatedAt
      : null;
    this.validatedBy = otherOutputModel.otherOutput.validatedBy
      ? new MiniUserOutput(otherOutputModel.otherOutput.validatedBy)
      : null;
    this.confirmedAt = otherOutputModel.otherOutput.confirmedAt
      ? otherOutputModel.otherOutput.confirmedAt
      : null;
    this.confirmedBy = otherOutputModel.otherOutput.confirmedBy
      ? new MiniUserOutput(otherOutputModel.otherOutput.confirmedBy)
      : null;
    this.withdrawBy = otherOutputModel.otherOutput.withdrawBy
      ? otherOutputModel.otherOutput.withdrawBy
      : null;
    this.canceledAt = otherOutputModel.otherOutput.canceledAt
      ? otherOutputModel.otherOutput.canceledAt
      : null;
    this.canceledBy = otherOutputModel.otherOutput.canceledBy
      ? new MiniUserOutput(otherOutputModel.otherOutput.canceledBy)
      : null;
    this.cancelReason = otherOutputModel.otherOutput.cancelReason
      ? otherOutputModel.otherOutput.cancelReason
      : null;
  }

  id: string;
  reference: string;
  barcode: string;
  outputType: OutputType;
  magentoOrderID?: string;
  status: OutputStatus;
  child?: MiniOtherOutputOutput;
  parent?: MiniOtherOutputOutput;
  storagePoint?: ExtraMiniStoragePointOutput;
  variantsToOutput: VariantToOutputOutput[];
  comments?: CommentItemOutput[];
  productItems?: ProductItemItemOutput[];
  stockMovements?: ExtraMiniStockMovementOutput[];
  createdAt: Date;
  createdBy?: MiniUserOutput;
  lastUpdate: Date;
  validatedAt?: Date;
  validatedBy?: MiniUserOutput;
  confirmedAt?: Date;
  confirmedBy?: MiniUserOutput;
  withdrawBy?: string;
  canceledAt?: Date;
  canceledBy?: MiniUserOutput;
  cancelReason?: string;
}
