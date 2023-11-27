import { VariantToOutput } from 'src/domain/entities/flows';
import { ProductVariantItemDetails } from 'src/domain/types/catalog/items';

export interface VariantToOutputItemDetails {
  variantToOutput: VariantToOutput;
  variantItem: ProductVariantItemDetails;
}
