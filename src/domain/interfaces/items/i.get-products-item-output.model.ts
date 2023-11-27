import { Product } from 'src/domain/entities/items';

export interface GetProductsItemOutputModel {
  product: Product;
  averageCost: number;
}
