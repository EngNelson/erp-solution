import { Location, StoragePoint } from 'src/domain/entities/warehouses';
import { AvailableStockModel } from '.';

export interface LocationModel {
  storagePoint: StoragePoint;
  location: Location;
  stock: AvailableStockModel;
}
