import { VariantProductItemsOutput } from 'src/domain/dto/items';

export class GetLocationProductItemsOutput {
  constructor(items: VariantProductItemsOutput[], totalItemsCount: number) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
  }

  items: VariantProductItemsOutput[];
  totalItemsCount: number;
}
