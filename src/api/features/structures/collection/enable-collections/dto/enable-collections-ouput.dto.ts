import { MiniCollectionOutput } from 'src/domain/dto/structures';

export class EnableCollectionsOutput {
  items: MiniCollectionOutput[];
  totalItemsEnabled: number;

  constructor(items: MiniCollectionOutput[], totalItemsDisabled: number) {
    this.items = items;
    this.totalItemsEnabled = totalItemsDisabled;
  }
}
