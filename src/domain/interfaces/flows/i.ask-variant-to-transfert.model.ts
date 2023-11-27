import { StoragePoint } from 'src/domain/entities/warehouses';
import { VariantToTransfertByStoragePointModel } from '.';

export interface AskVariantToTransfertModel {
  sourceStoragePoint: StoragePoint;
  variantsToTransfert: VariantToTransfertByStoragePointModel[];
}
