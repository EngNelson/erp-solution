import { ProductVariant } from 'src/domain/entities/items';
import { Supplier } from 'src/domain/entities/purchases';
import { OperationLineState } from 'src/domain/enums/flows';

export interface EditedVariantsToReceivedModel {
  id?: string;
  position: number;
  productVariant: ProductVariant;
  newQuantity: number;
  newState: OperationLineState;
  purchaseCost: number;
  supplier?: Supplier;
}
