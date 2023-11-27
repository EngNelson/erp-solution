import { ISOLang } from '@glosuite/shared';
import { ExtraMiniStoragePointOutput } from 'src/domain/dto/warehouses';
import { StoragePoint } from 'src/domain/entities/warehouses';

export class GetProfitResumeOutput {
  constructor(
    year: number,
    purchases: number[],
    sales: number[],
    entries: number[],
    outputs: number[],
    lang: ISOLang,
    storagePoint?: StoragePoint,
  ) {
    this.year = year;
    this.storagePoint = storagePoint
      ? new ExtraMiniStoragePointOutput(storagePoint)
      : null;
    this.purchases = purchases;
    this.sales = sales;
    this.entries = entries;
    this.outputs = outputs;
  }

  year: number;
  storagePoint: ExtraMiniStoragePointOutput;
  purchases: number[];
  sales: number[];
  entries: number[];
  outputs: number[];
}
