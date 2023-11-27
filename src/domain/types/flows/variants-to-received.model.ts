import { VariantReception } from 'src/domain/entities/flows';
import { ProductVariantItemDetails } from '../catalog/items';

export type VariantsToReceivedModel = {
  variantReception: VariantReception;
  variantDetails: Partial<ProductVariantItemDetails>;
};
