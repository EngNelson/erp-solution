import { VariantTransfert } from 'src/domain/entities/flows';
import { LocationModel } from 'src/domain/interfaces/warehouses';
import { ProductVariantItemDetails } from '../catalog/items';

export type VariantsToTransfertModel = {
  variantTransfert: VariantTransfert;
  variantDetails: Partial<ProductVariantItemDetails>;
  locations: LocationModel[];
};
