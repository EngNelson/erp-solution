import { VariantNeeded } from 'src/domain/entities/flows';
import { LocationModel } from 'src/domain/interfaces/warehouses';
import { ProductVariantItemDetails } from '../catalog/items';

export type VariantNeededModel = {
  variantNeeded: VariantNeeded;
  variantDetails: Partial<ProductVariantItemDetails>;
  locations: LocationModel[];
};
