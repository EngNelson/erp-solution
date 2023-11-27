import { MiniReceptionOutput } from 'src/domain/dto/flows';

export class GetReceptionsToBeStoredOutput {
  items: MiniReceptionOutput[];
  totalItemsCount: number;

  constructor(items: MiniReceptionOutput[], totalItemsCount: number) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
  }
}
