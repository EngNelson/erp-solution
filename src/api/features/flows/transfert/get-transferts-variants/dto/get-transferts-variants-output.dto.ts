import { VariantTransfertOutput } from 'src/domain/dto/flows/transfert';

export class GetTransfertsVariantsOutput {
  items: VariantTransfertOutput[];
  totalItemsCount: number;

  constructor(items: VariantTransfertOutput[], totalItemsCount: number) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
  }
}
