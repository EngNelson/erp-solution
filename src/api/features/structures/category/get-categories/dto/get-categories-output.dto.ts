import { CategoryTreeItemOutput } from 'src/domain/dto/structures';

export class GetCategoriesOutput {
  items: CategoryTreeItemOutput[];
  totalItemsCount: number;

  constructor(items: CategoryTreeItemOutput[], totalItemsCount: number) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
  }
}
