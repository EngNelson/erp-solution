import { ISOLang } from '@glosuite/shared';
import { ProductItemInventoryStatus } from 'src/domain/enums/flows';
import { ProductItemInventoryOutputModel } from 'src/domain/interfaces/flows';
import { ProductItemItemOutput } from '../items';

export class ProductItemInventoryOutput {
  constructor(itemState: ProductItemInventoryOutputModel, lang: ISOLang) {
    this.productItem = new ProductItemItemOutput(itemState.productItem, lang);
    this.status = itemState.status;
  }

  productItem: ProductItemItemOutput;
  status: ProductItemInventoryStatus;
}
