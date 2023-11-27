import { ProductVariant } from 'src/domain/entities/items';
import { VariantLocalisation } from '.';

export interface VariantAvailability {
  variant: ProductVariant;
  missingQty: number;
  localisations?: VariantLocalisation[];
}
