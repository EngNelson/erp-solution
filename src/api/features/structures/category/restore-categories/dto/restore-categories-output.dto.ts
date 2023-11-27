import {
  getLangOrFirstAvailableValue,
  ISOLang,
  Status,
} from '@glosuite/shared';
import { Category } from 'src/domain/entities/structures';

export class RestoreCategoriesOutput {
  items: RestoreCategoriesOutputItems[];
  totalItemsRestored: number;

  constructor(
    items: RestoreCategoriesOutputItems[],
    totalItemsRestored: number,
  ) {
    this.items = items;
    this.totalItemsRestored = totalItemsRestored;
  }
}

export class RestoreCategoriesOutputItems {
  constructor(category: Category, lang: ISOLang) {
    this.id = category.id;
    this.title = getLangOrFirstAvailableValue(category.title, lang);
    this.status = category.status;
  }

  id: string;
  title: string;
  status: Status;
}
