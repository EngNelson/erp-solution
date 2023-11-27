import { ProductItemOutput } from 'src/domain/dto/items';

export class GetCategoryProductsOutput {
  constructor(items: ProductItemOutput[], totalItemsCount: number) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
  }

  items: ProductItemOutput[];
  totalItemsCount: number;
}
