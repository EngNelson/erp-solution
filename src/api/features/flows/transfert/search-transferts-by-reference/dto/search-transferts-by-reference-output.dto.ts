import { MiniTransfertOutput } from 'src/domain/dto/flows';

export class SearchTransfertsByReferenceOutput {
  items: MiniTransfertOutput[];
  totalItemsCount: number;

  constructor(items: MiniTransfertOutput[], totalItemsCount: number) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
  }
}
