import { Location } from 'src/domain/entities/warehouses';
import { ProductVariantItemDetails } from 'src/domain/types/catalog/items';

export interface VariantToPickModel {
  variant: Partial<ProductVariantItemDetails>;
  quantityToPick: number;
  locations: Location[];
}
