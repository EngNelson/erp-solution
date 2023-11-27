import { ProductQuantity } from 'src/domain/interfaces';

export type InventoryStateInputType = {
  variantId: string;
  inStock: ProductQuantity;
  counted: ProductQuantity;
  itemBarcodes: string[];
};
