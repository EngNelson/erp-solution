import { ProductItem } from 'src/domain/entities/items';
import { ProductItemInventoryStatus } from 'src/domain/enums/flows';

export interface ProductItemInventoryOutputModel {
  productItem: ProductItem;
  status: ProductItemInventoryStatus;
}
