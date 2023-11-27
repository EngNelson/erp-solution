import { VariantToOutput } from 'src/domain/entities/flows';
import { ProductItem, ProductVariant } from 'src/domain/entities/items';

export interface VariantToOutputLineModel {
  variantToOutput: VariantToOutput;
  quantity: number;
  productItems: ProductItem[];
  variant: ProductVariant;
}
