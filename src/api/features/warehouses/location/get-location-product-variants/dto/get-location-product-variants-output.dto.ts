import { ProductVariantItemOutput } from 'src/domain/dto/items';

export class GetLocationProductVariantsOutput {
  constructor(items: ProductVariantItemOutput[], totalItemsCount: number) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
  }

  items: ProductVariantItemOutput[];
  totalItemsCount: number;
}
