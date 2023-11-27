import { ISOLang } from '@glosuite/shared';
import { StatusLine } from 'src/domain/enums/flows';
import { VariantNeededModel } from 'src/domain/types/flows';
import { MiniProductVariantOutput } from '../items';
import { PickPackLocationOutput } from '../warehouses';

export class VariantNeededOutput {
  constructor(variantModel: VariantNeededModel, lang: ISOLang) {
    this.id = variantModel.variantNeeded.id;
    this.quantity = variantModel.variantNeeded.quantity;
    this.pickedQuantity = variantModel.variantNeeded.pickedQuantity;
    this.status = variantModel.variantNeeded.status;
    this.position = variantModel.variantNeeded.position;
    this.value = variantModel.variantNeeded.value;
    this.variant = new MiniProductVariantOutput(
      variantModel.variantDetails,
      lang,
    );
    this.locations = variantModel.locations.map(
      (locationModel) => new PickPackLocationOutput(locationModel, lang),
    );
  }

  id: string;
  quantity: number;
  pickedQuantity: number;
  status: StatusLine;
  position: number;
  value: number;
  variant: MiniProductVariantOutput;
  locations: PickPackLocationOutput[];
}
