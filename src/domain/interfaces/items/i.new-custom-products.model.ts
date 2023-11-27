import { Product, ProductVariant } from 'src/domain/entities/items';
import { Supplier } from 'src/domain/entities/purchases';

export interface NewCustomProductModel {
  product: Product;
  variant: ProductVariant;
  quantity: number;
  supplier?: Supplier;
}
