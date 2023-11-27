import { getLangOrFirstAvailableValue, ISOLang } from '@glosuite/shared';
import { TransfertStatus, TransfertType } from 'src/domain/enums/flows';
import { TransfertModel } from 'src/domain/types/flows';
import { ExtraMiniStoragePointOutput } from '../warehouses';
import { VariantsToTransfertOutput } from './variants-to-transfert-output.dto';
import { ExtraMiniOrderOutput } from '../orders';

export class TransfertItemOutput {
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
    this.order = transfertModel.transfert.order
      ? new ExtraMiniOrderOutput(transfertModel.transfert.order)
      : null;
    this.description = transfertModel.transfert.description
      ? getLangOrFirstAvailableValue(transfertModel.transfert.description, lang)
      : null;
    this.isRequest = transfertModel.transfert.isRequest;
    this.variants = transfertModel.variantsToTransfert.map(
      (variantToTransfert) =>
        new VariantsToTransfertOutput(variantToTransfert, lang),
    );
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
  order?: ExtraMiniOrderOutput;
  description?: string;
  isRequest: boolean;
  variants: VariantsToTransfertOutput[];
  createdAt: Date;
  lastUpdate?: Date;
}
