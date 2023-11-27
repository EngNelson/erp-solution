import { AskVariantToTransfertModel } from '../flows';
import { ProductVariantToPurchaseModel } from '../purchases';

export interface TransfertAndPurchaseProcessOutput {
  askVariantsToTransfert: AskVariantToTransfertModel[];
  variantsToPurchased: ProductVariantToPurchaseModel[];
}
