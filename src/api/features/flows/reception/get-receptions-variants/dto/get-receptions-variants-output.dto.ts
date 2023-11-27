import { VariantReceptionOutput } from 'src/domain/dto/flows';

export class GetReceptionsVariantsOutput {
  items: VariantReceptionOutput[];
  totalItemsCount: number;

  constructor(items: VariantReceptionOutput[], totalItemsCount: number) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
  }
}
