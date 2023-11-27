import { OperationLineState } from 'src/domain/enums/flows';

export type EditedVariantsToReceivedType = {
  variantReceptionId: string;
  newQuantity: number;
  purchaseCost: number;
  newState: OperationLineState;
};
