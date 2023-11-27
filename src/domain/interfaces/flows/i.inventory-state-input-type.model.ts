import { ProductVariant } from 'src/domain/entities/items';
import { ProductQuantity } from '../i.product-quantity';
import { ProductItemInventoryOutputModel } from './i.product-item-inventory-output.model';

export interface InventoryStateInputTypeModel {
  variant: ProductVariant;
  inStock: ProductQuantity;
  counted: ProductQuantity;
  itemsStates: ProductItemInventoryOutputModel[];
}
