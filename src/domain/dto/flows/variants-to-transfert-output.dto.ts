import { ISOLang } from '@glosuite/shared';
import { OperationLineState, StatusLine } from 'src/domain/enums/flows';
import { VariantsToTransfertModel } from 'src/domain/types/flows';
import { MiniProductVariantOutput } from '../items';
import { PickPackLocationOutput } from '../warehouses';

export class VariantsToTransfertOutput {
  constructor(variantModel: VariantsToTransfertModel, lang: ISOLang) {
    this.id = variantModel.variantTransfert.id;
    this.position = variantModel.variantTransfert.position;
    this.variant = new MiniProductVariantOutput(
      variantModel.variantDetails,
      lang,
    );
    this.quantity = variantModel.variantTransfert.quantity;
    this.pickedQuantity = variantModel.variantTransfert.pickedQuantity;
    this.status = variantModel.variantTransfert.status;
    this.state = variantModel.variantTransfert.state;
    this.locations = variantModel.locations.map(
      (locationModel) => new PickPackLocationOutput(locationModel, lang),
    );
    this.createdAt = variantModel.variantTransfert.createdAt;
  }

  id: string;
  position: number;
  variant: MiniProductVariantOutput;
  quantity: number;
  pickedQuantity: number;
  status: StatusLine;
  state: OperationLineState;
  locations: PickPackLocationOutput[];
  createdAt: Date;
}
