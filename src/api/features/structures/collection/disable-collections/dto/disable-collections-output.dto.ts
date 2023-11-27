import { MiniCollectionOutput } from 'src/domain/dto/structures';

export class DisableCollectionsOutput {
  items: MiniCollectionOutput[];
  totalItemsDisabled: number;

  constructor(items: MiniCollectionOutput[], totalItemsDisabled: number) {
    this.items = items;
    this.totalItemsDisabled = totalItemsDisabled;
  }
}
