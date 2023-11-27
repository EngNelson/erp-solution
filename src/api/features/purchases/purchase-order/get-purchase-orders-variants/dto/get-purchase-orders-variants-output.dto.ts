import { VariantPurchasedOutput } from 'src/domain/dto/purchases';

export class GetPurchaseOrdersVariantsOutput {
  items: VariantPurchasedOutput[];
  totalItemsCount: number;

  constructor(items: VariantPurchasedOutput[], totalItemsCount: number) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
  }
}
