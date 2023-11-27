import { ISOLang } from '@glosuite/shared';
import { ProductItem } from 'src/domain/entities/items';
import { StepStatus } from 'src/domain/enums/flows';
import { ItemState } from 'src/domain/enums/items';
import { RestrictedProductVariantOutput } from '.';

export class ProductItemWithVariantOutput {
  constructor(item: ProductItem, lang: ISOLang) {
    this.id = item.id;
    this.reference = item.reference;
    this.variant = new RestrictedProductVariantOutput(
      item.productVariant,
      lang,
    );
    this.barcode = item.barcode;
    this.state = item.state;
    this.status = item.status;
  }

  id: string;
  reference: string;
  variant: RestrictedProductVariantOutput;
  barcode: string;
  state: ItemState;
  status: StepStatus;
}
