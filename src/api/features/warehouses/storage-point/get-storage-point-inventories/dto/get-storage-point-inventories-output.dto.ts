import { MiniInventoryOutput } from 'src/domain/dto/flows';

export class GetStoragePointInventoriesOutput {
  items: MiniInventoryOutput[];
  totalItemsCount: number;

  constructor(items: MiniInventoryOutput[], totalItemsCount: number) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
  }
}
