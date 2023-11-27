import { ProductItem } from 'src/domain/entities/items';
import { StoragePoint } from 'src/domain/entities/warehouses';

export interface ProductItemDetails {
  productItem: ProductItem;
  storagePoint?: StoragePoint;
}
