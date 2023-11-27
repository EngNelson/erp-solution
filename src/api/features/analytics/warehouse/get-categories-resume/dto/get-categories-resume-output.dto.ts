import { ISOLang } from '@glosuite/shared';
import { ExtraMiniStoragePointOutput } from 'src/domain/dto/warehouses';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { CategoryData } from 'src/domain/interfaces/structures';

export class GetCategoriesResumeOutput {
  constructor(
    categories: CategoryData[],
    etats: number[],
    defectueux: number[],
    purchases: number[],
    sales: number[],
    inTransit: number[],
    lang: ISOLang,
    storagePoint?: StoragePoint,
  ) {
    this.categories = categories;
    this.etats = etats;
    this.defectueux = defectueux;
    this.purchases = purchases;
    this.sales = sales;
    this.inTransit = inTransit;
    this.storagePoint = !!storagePoint
      ? new ExtraMiniStoragePointOutput(storagePoint)
      : null;
  }

  categories: CategoryData[];
  etats: number[];
  defectueux: number[];
  purchases: number[];
  sales: number[];
  inTransit: number[];
  storagePoint: ExtraMiniStoragePointOutput;
}
