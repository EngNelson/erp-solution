import { ISOLang } from '@glosuite/shared';
import {
  VariantToOutputItemDetails,
  VariantToOutputModel,
} from 'src/domain/interfaces/flows';
import { MiniProductVariantOutput, ProductVariantItemOutput } from '../items';
import { PickPackLocationOutput } from '../warehouses';

export class VariantToOutputOutput {
  constructor(variantToOutputModel: VariantToOutputModel, lang: ISOLang) {
    this.id = variantToOutputModel.variantToOutput.id;
    this.quantity = variantToOutputModel.variantToOutput.quantity;
    this.variant = new MiniProductVariantOutput(
      variantToOutputModel.variantDetails,
      lang,
    );
    this.locations = variantToOutputModel.locations.map(
      (locationModel) => new PickPackLocationOutput(locationModel, lang),
    );
    this.createdAt = variantToOutputModel.variantToOutput.createdAt;
  }

  id: string;
  quantity: number;
  variant: MiniProductVariantOutput;
  locations: PickPackLocationOutput[];
  createdAt: Date;
}

export class VariantOutputOutput {
  constructor(variantOutputItem: VariantToOutputItemDetails, lang: ISOLang) {
    this.id = variantOutputItem.variantToOutput.id;
    this.quantity = variantOutputItem.variantToOutput.quantity;
    this.variant = new ProductVariantItemOutput(
      variantOutputItem.variantItem,
      lang,
    );
    this.createdAt = variantOutputItem.variantToOutput.createdAt;
  }

  id: string;
  quantity: number;
  variant: ProductVariantItemOutput;
  createdAt: Date;
}
