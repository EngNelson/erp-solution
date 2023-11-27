import { OperationLineState } from 'src/domain/enums/flows';

export type EditedVariantsToTransfertType = {
  variantTransfertId: string;
  newQuantity: number;
  newState: OperationLineState;
};
