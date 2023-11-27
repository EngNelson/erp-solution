import {
  getLangOrFirstAvailableValue,
  ISOLang,
  Status,
} from '@glosuite/shared';
import { Category } from 'src/domain/entities/structures';

export class MiniCategoryOutput {
  constructor(category: Category, lang: ISOLang) {
    this.id = category.id;
    this.magentoId = category.magentoId ? category.magentoId : null;
    this.title = getLangOrFirstAvailableValue(category.title, lang);
    this.description = category.description
      ? getLangOrFirstAvailableValue(category.description, lang)
      : null;
    this.status = category.status;
  }

  id: string;
  magentoId?: number;
  title: string;
  description?: string;
  status: Status;
}
