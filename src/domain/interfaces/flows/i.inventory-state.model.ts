import { InventoryState } from 'src/domain/entities/flows';
import { ProductVariantItemDetails } from 'src/domain/types/catalog/items';
import { ProductQuantity } from '../i.product-quantity';
import { ProductItemInventoryOutputModel } from './i.product-item-inventory-output.model';

export interface InventoryStateModel {
  inventoryState: InventoryState;
  variant: Partial<ProductVariantItemDetails>;
  inStock: ProductQuantity;
  counted: ProductQuantity;
  itemsStates?: ProductItemInventoryOutputModel[];
}
