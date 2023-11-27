import { Product, ProductVariant } from 'src/domain/entities/items';
import { Unit } from 'src/domain/entities/items/eav';

export interface ProductCreatedFromImport {
  product: Product;
  variant: ProductVariant;
  units?: Unit[];
}
