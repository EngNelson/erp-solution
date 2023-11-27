import { OperationLineState } from 'src/domain/enums/flows';

export type EditedVariantsToPurchaseType = {
  variantPurchasedId: string;
  newQuantity: number;
  newState: OperationLineState;
};
