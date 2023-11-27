import { ISOLang } from '@glosuite/shared';
import { InventoryState } from 'src/domain/entities/flows';
import { ProductQuantity } from 'src/domain/interfaces';
import { ProductItemInventoryOutputModel } from 'src/domain/interfaces/flows';
import { ExtraMiniProductVariantOutput, ProductItemInventoryOutput } from '.';

export class MiniInventoryStateOutput {
  constructor(
    inventoryState: InventoryState,
    itemsStates: ProductItemInventoryOutputModel[],
    lang: ISOLang,
  ) {
    this.id = inventoryState.id;
    this.variant = new ExtraMiniProductVariantOutput(
      inventoryState.variant,
      lang,
    );
    this.inStock = inventoryState.inStock;
    this.counted = inventoryState.counted;
    this.itemBarcodes = itemsStates
      ? itemsStates.map(
          (itemState) => new ProductItemInventoryOutput(itemState, lang),
        )
      : [];
  }

  id: string;
  variant: ExtraMiniProductVariantOutput;
  inStock: ProductQuantity;
  counted: ProductQuantity;
  itemBarcodes?: ProductItemInventoryOutput[];
}
