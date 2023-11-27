import { Product } from 'src/domain/entities/items';

export type ProductCompositionModel = {
  child: Product;
  required: boolean;
  defaultQuantity: number;
};
