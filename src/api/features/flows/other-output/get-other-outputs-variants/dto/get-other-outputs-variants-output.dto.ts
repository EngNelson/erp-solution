import { VariantOutputOutput } from 'src/domain/dto/flows';

export class GetOtherOutputsVariantsOutput {
  items: VariantOutputOutput[];
  totalItemsCount: number;

  constructor(items: VariantOutputOutput[], totalItemsCount: number) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
  }
}
