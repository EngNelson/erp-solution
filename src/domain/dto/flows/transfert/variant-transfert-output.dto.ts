import { ISOLang } from '@glosuite/shared';
import { OperationLineState, StatusLine } from 'src/domain/enums/flows';
import { VariantTransfertItemDetails } from 'src/domain/interfaces/flows/transfert';
import { ProductVariantItemOutput } from '../../items';

export class VariantTransfertOutput {
  constructor(
    variantTransfertItem: VariantTransfertItemDetails,
    lang: ISOLang,
  ) {
    this.id = variantTransfertItem.variantTransfert.id;
    this.quantity = variantTransfertItem.variantTransfert.quantity;
    this.pickedQuantity = variantTransfertItem.variantTransfert.pickedQuantity;
    this.state = variantTransfertItem.variantTransfert.state;
    this.status = variantTransfertItem.variantTransfert.status;
    this.variant = new ProductVariantItemOutput(
      variantTransfertItem.variantItem,
      lang,
    );
  }

  id: string;
  quantity: number;
  pickedQuantity: number;
  status: StatusLine;
  state: OperationLineState;
  variant: ProductVariantItemOutput;
}
