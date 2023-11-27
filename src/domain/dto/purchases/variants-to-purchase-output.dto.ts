import { ISOLang } from '@glosuite/shared';
import { OperationLineState } from 'src/domain/enums/flows';
import { PurchaseStatusLine } from 'src/domain/enums/purchases';
import { VariantsToPurchaseModel } from 'src/domain/types/purchases';
import { SupplierItemOutput } from '.';
import { MiniProductVariantOutput } from '../items';

export class VariantsToPurchaseOutput {
  constructor(variantModel: VariantsToPurchaseModel, lang: ISOLang) {
    this.id = variantModel.variantPurchased.id;
    this.quantity = variantModel.variantPurchased.quantity;
    this.state = variantModel.variantPurchased.state;
    this.status = variantModel.variantPurchased.status
      ? variantModel.variantPurchased.status
      : null;
    this.comment = variantModel.variantPurchased.comment
      ? variantModel.variantPurchased.comment
      : null;
    this.position = variantModel.variantPurchased.position;
    this.purchaseCost = variantModel.variantPurchased.purchaseCost;
    this.customPrice = variantModel.variantPurchased.customPrice
      ? variantModel.variantPurchased.customPrice
      : null;
    this.realCost = variantModel.variantPurchased.realCost
      ? variantModel.variantPurchased.realCost
      : null;
    this.supplier = variantModel.variantPurchased.supplier
      ? new SupplierItemOutput(variantModel.variantPurchased.supplier)
      : null;
    this.variant = new MiniProductVariantOutput(
      variantModel.variantDetails,
      lang,
    );
  }

  id: string;
  quantity: number;
  state: OperationLineState;
  status?: PurchaseStatusLine;
  comment?: string;
  position: number;
  purchaseCost: number;
  customPrice?: number;
  realCost?: number;
  supplier?: SupplierItemOutput;
  variant: MiniProductVariantOutput;
}
