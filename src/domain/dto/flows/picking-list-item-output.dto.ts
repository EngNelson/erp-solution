import { ISOLang } from '@glosuite/shared';
import { PickingList } from 'src/domain/entities/flows';
import { OperationStatus, PickingPurpose } from 'src/domain/enums/flows';
import { VariantToPickModel } from 'src/domain/interfaces/flows';
import { VariantToPickOutput } from '.';
import { MiniUserOutput } from '../auth';

export class PickingListItemOutput {
  constructor(
    picking: PickingList,
    variantsToPick: VariantToPickModel[],
    lang: ISOLang,
  ) {
    this.id = picking.id;
    this.reference = picking.reference;
    this.purpose = picking.purpose;
    this.status = picking.status;
    // this.transfert = picking.transfert
    //   ? new MiniTransfertOutput(picking.transfert, lang)
    //   : null;
    // this.order = picking.order
    //   ? new MiniOrderOutput(picking.order, lang)
    //   : null;
    // this.internalNeed = picking.internalNeed
    //   ? new MiniInternalNeedOutput(picking.internalNeed)
    //   : null;
    this.variantsToPick = variantsToPick.map(
      (variantToPick) =>
        new VariantToPickOutput(
          variantToPick.variant,
          variantToPick.quantityToPick,
          variantToPick.locations.map((location) => location),
          lang,
        ),
    );
    this.validatedBy = picking.validatedBy
      ? new MiniUserOutput(picking.validatedBy)
      : null;
    this.createdAt = picking.createdAt;
    this.lastUpdate = picking.lastUpdate ? picking.lastUpdate : null;
  }

  id: string;
  reference: string;
  purpose: PickingPurpose;
  status: OperationStatus;
  // transfert?: MiniTransfertOutput;
  // order?: MiniOrderOutput;
  // internalNeed?: MiniInternalNeedOutput;
  variantsToPick?: VariantToPickOutput[];
  validatedBy?: MiniUserOutput;
  createdAt: Date;
  lastUpdate?: Date;
}
