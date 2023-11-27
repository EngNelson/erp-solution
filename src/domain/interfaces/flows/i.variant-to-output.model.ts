import { VariantToOutput } from 'src/domain/entities/flows';
import { ProductVariantItemDetails } from 'src/domain/types/catalog/items';
import { LocationModel } from '../warehouses';

export interface VariantToOutputModel {
  variantToOutput: VariantToOutput;
  variantDetails: Partial<ProductVariantItemDetails>;
  locations: LocationModel[];
}
