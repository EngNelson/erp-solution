import { PickingListItemOutput } from 'src/domain/dto/flows';

export class ValidatePickingListsOutput {
  items: PickingListItemOutput[];
  totalItemsCount: number;

  constructor(items: PickingListItemOutput[], totalItemsCount: number) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
  }
}
