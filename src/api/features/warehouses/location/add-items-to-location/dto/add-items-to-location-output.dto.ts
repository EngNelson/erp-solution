import { ProductItemItemOutput } from 'src/domain/dto/items';

export class AddItemsToLocationOutput {
  constructor(items: ProductItemItemOutput[], totalItems: number) {
    this.items = items;
    this.totalItems = totalItems;
  }

  items: ProductItemItemOutput[];
  totalItems: number;
}
