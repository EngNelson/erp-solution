import { ISOLang } from '@glosuite/shared';
import { OperationLineState } from 'src/domain/enums/flows';
import { PurchaseStatusLine } from 'src/domain/enums/purchases';
import { VariantPurchasedItemDetails } from 'src/domain/types/purchases';
import { ProductVariantItemOutput } from '../items';

export class VariantPurchasedOutput {
  constructor(
    variantPurchasedItem: VariantPurchasedItemDetails,
    lang: ISOLang,
  ) {
    this.id = variantPurchasedItem.variantPurchased.id;
    this.quantity = variantPurchasedItem.variantPurchased.quantity;
    this.state = variantPurchasedItem.variantPurchased.state;
    this.status = variantPurchasedItem.variantPurchased.status
      ? variantPurchasedItem.variantPurchased.status
      : null;
    this.comment = variantPurchasedItem.variantPurchased.comment
      ? variantPurchasedItem.variantPurchased.comment
      : null;
    this.purchaseCost = variantPurchasedItem.variantPurchased.purchaseCost;
    this.realCost = variantPurchasedItem.variantPurchased.realCost
      ? variantPurchasedItem.variantPurchased.realCost
      : null;
    this.variant = new ProductVariantItemOutput(
      variantPurchasedItem.variantItem,
      lang,
    );
  }

  id: string;
  quantity: number;
  state: OperationLineState;
  status?: PurchaseStatusLine;
  comment?: string;
  purchaseCost: number;
  realCost?: number;
  variant: ProductVariantItemOutput;
}
