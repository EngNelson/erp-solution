import { ISOLang } from '@glosuite/shared';
import { OperationLineState } from 'src/domain/enums/flows';
import { VariantReceptionItemDetails } from 'src/domain/types/flows';
import { ProductVariantItemOutput } from '../items';

export class VariantReceptionOutput {
  constructor(
    variantReceptionItem: VariantReceptionItemDetails,
    lang: ISOLang,
  ) {
    this.id = variantReceptionItem.variantReception.id;
    this.quantity = variantReceptionItem.variantReception.quantity;
    this.state = variantReceptionItem.variantReception.state;
    this.purchaseCost = variantReceptionItem.variantReception.purchaseCost
      ? variantReceptionItem.variantReception.purchaseCost
      : null;
    this.variant = new ProductVariantItemOutput(
      variantReceptionItem.variantItem,
      lang,
    );
  }

  id: string;
  quantity: number;
  state: OperationLineState;
  purchaseCost?: number;
  variant: ProductVariantItemOutput;
}
