import { ProductVariant } from 'src/domain/entities/items';

export interface VariantToTransfertByStoragePointModel {
  variant: ProductVariant;
  quantity: number;
}
