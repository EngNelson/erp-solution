import { StoragePoint } from 'src/domain/entities/warehouses';

export interface VariantLocalisation {
  storagePoint: StoragePoint;
  quantity: number;
}
