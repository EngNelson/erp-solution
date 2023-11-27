import { ProductVariant } from '../entities/items';
import { OperationLineState } from '../enums/flows';

export interface EditedVariantsToTransfertModel {
  id?: string;
  position: number;
  productVariant: ProductVariant;
  newQuantity: number;
  newState: OperationLineState;
}
