import {
  getLangOrFirstAvailableValue,
  ISOLang,
  Status,
} from '@glosuite/shared';
import { Category } from 'src/domain/entities/structures';
import { MiniCategoryOutput } from '.';
import { MiniUserOutput } from '../auth';
import { MiniCollectionOutput } from './mini-collection-output.dto';

export class CategoryItemOutput {
  constructor(category: Category, lang: ISOLang) {
    this.id = category.id;
    this.magentoId = category.magentoId ? category.magentoId : null;
    this.title = getLangOrFirstAvailableValue(category.title, lang);
    this.description = category.description
      ? getLangOrFirstAvailableValue(category.description, lang)
      : null;
    this.status = category.status;
    this.symbol = category.symbol;
    this.addInStatistics = category.addInStatistics;
    this.createdBy = category.createdBy
      ? new MiniUserOutput(category.createdBy)
      : null;
    this.parent =
      category.parentCategory &&
      category.parentCategory.status === category.status
        ? new MiniCategoryOutput(category.parentCategory, lang)
        : null;
    this.subCategories = category.subCategories
      ? category.subCategories.map((subCat) => {
          if (subCat.status === category.status)
            return new MiniCategoryOutput(subCat, lang);
        })
      : [];
    this.collections = category.collections
      ? category.collections.map((col) => {
          if (col.status === category.status)
            return new MiniCollectionOutput(col, lang);
        })
      : [];
    this.disabledBy = category.disabledBy
      ? new MiniUserOutput(category.disabledBy)
      : null;
    this.disabledAt = category.disabledAt ? category.disabledAt : null;
  }

  id: string;
  magentoId?: number;
  title: string;
  description?: string;
  status: Status;
  symbol: string;
  addInStatistics: boolean;
  createdBy?: MiniUserOutput;
  parent?: MiniCategoryOutput;
  subCategories?: MiniCategoryOutput[];
  collections?: MiniCollectionOutput[];
  disabledBy?: MiniUserOutput;
  disabledAt?: Date;
}
