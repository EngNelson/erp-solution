import { VariantTransfert } from 'src/domain/entities/flows';
import { ProductVariantItemDetails } from 'src/domain/types/catalog/items';

export interface VariantTransfertItemDetails {
  variantTransfert: VariantTransfert;
  variantItem: ProductVariantItemDetails;
}
