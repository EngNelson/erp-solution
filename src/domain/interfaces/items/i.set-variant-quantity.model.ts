import { ProductVariant } from 'src/domain/entities/items';
import { QuantityProprety } from 'src/domain/enums/items';
import { UpdatedType } from 'src/domain/enums/warehouses';

export interface SetVariantQuantityModel {
  variant: ProductVariant;
  quantity: number;
  type: UpdatedType;
  property: QuantityProprety;
}
