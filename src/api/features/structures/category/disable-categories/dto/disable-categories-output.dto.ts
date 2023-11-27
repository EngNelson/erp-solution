import {
  getLangOrFirstAvailableValue,
  ISOLang,
  Status,
} from '@glosuite/shared';
import { Category } from 'src/domain/entities/structures';

export class DisableCategoriesOutput {
  items: DisableCategoriesOutputItems[];
  totalItemsDisabled: number;

  constructor(
    items: DisableCategoriesOutputItems[],
    totalItemsDisabled: number,
  ) {
    this.items = items;
    this.totalItemsDisabled = totalItemsDisabled;
  }
}

export class DisableCategoriesOutputItems {
  constructor(category: Category, lang: ISOLang) {
    this.id = category.id;
    this.title = getLangOrFirstAvailableValue(category.title, lang);
    this.status = category.status;
  }

  id: string;
  title: string;
  status: Status;
}
