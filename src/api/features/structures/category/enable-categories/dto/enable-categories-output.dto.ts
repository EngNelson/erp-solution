import {
  getLangOrFirstAvailableValue,
  ISOLang,
  Status,
} from '@glosuite/shared';
import { Category } from 'src/domain/entities/structures';

export class EnableCategoriesOutput {
  items: EnableCategoriesOutputItems[];
  totalItemsEnabled: number;

  constructor(
    items: EnableCategoriesOutputItems[],
    totalItemsDisabled: number,
  ) {
    this.items = items;
    this.totalItemsEnabled = totalItemsDisabled;
  }
}

export class EnableCategoriesOutputItems {
  constructor(category: Category, lang: ISOLang) {
    this.id = category.id;
    this.title = getLangOrFirstAvailableValue(category.title, lang);
    this.status = category.status;
  }

  id: string;
  title: string;
  status: Status;
}
