import { CollectionItemOutput } from 'src/domain/dto/structures';

export class GetCategoryCollectionsOutput {
  items: CollectionItemOutput[];
  totalItemsCount: number;

  constructor(items: CollectionItemOutput[], totalItemsCount: number) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
  }
}
