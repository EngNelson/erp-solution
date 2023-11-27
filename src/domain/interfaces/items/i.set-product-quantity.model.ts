import { Product } from 'src/domain/entities/items';
import { QuantityProprety } from 'src/domain/enums/items';
import { UpdatedType } from 'src/domain/enums/warehouses';

export interface SetProductQuantityModel {
  product: Product;
  quantity: number;
  type: UpdatedType;
  property: QuantityProprety;
}
