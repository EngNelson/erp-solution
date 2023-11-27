import { ISOLang } from '@glosuite/shared';
import { ProductQuantity } from 'src/domain/interfaces';
import { InventoryStateModel } from 'src/domain/interfaces/flows';
import { MiniProductVariantOutput } from '../items';
import { ProductItemInventoryOutput } from './product-item-inventory-output.dto';

export class InventoryStateItemOutput {
  constructor(inventoryStateModel: InventoryStateModel, lang: ISOLang) {
    this.id = inventoryStateModel.inventoryState.id;
    this.variant = new MiniProductVariantOutput(
      inventoryStateModel.variant,
      lang,
    );
    this.inStock = inventoryStateModel.inStock;
    this.counted = inventoryStateModel.counted;
    this.itemsStates = inventoryStateModel.itemsStates
      ? inventoryStateModel.itemsStates.map(
          (itemState) => new ProductItemInventoryOutput(itemState, lang),
        )
      : [];
  }

  id: string;
  variant: MiniProductVariantOutput;
  inStock: ProductQuantity;
  counted: ProductQuantity;
  itemsStates?: ProductItemInventoryOutput[];
}
