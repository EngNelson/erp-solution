import { ProductVariant } from 'src/domain/entities/items';
import { Supplier } from 'src/domain/entities/purchases';

export interface ProductVariantToReceivedModel {
  productVariant: ProductVariant;
  quantity: number;
  purchaseCost: number;
  supplier?: Supplier;
}
