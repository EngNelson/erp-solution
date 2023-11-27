import { Inventory } from 'src/domain/entities/flows';
import { InventoryStateModel } from './i.inventory-state.model';

export interface InventoryModel {
  inventory: Inventory;
  inventoryStates?: InventoryStateModel[];
}
