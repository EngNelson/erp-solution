import { MiniOrderOutput } from 'src/domain/dto/orders';

export class ValidateOutputOutput {
  items: MiniOrderOutput[];
  totalItemsCount: number;

  constructor(items: MiniOrderOutput[], totalItemsCount: number) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
  }
}
