import {
  CollectionType,
  getLangOrFirstAvailableValue,
  ISOLang,
  Status,
} from '@glosuite/shared';
import { CollectionModel } from 'src/domain/interfaces/structures';
import { MiniCategoryOutput, MiniCollectionOutput } from '.';
import { MiniUserOutput } from '../auth';
import { MiniProductVariantOutput } from '../items';

export class CollectionItemOutput {
  constructor(collectionModel: CollectionModel, lang: ISOLang) {
    this.id = collectionModel.collection.id;
    this.magentoId = collectionModel.collection.magentoId
      ? collectionModel.collection.magentoId
      : null;
    this.title = getLangOrFirstAvailableValue(
      collectionModel.collection.title,
      lang,
    );
    this.description = collectionModel.collection.description
      ? getLangOrFirstAvailableValue(
          collectionModel.collection.description,
          lang,
        )
      : null;
    this.status = collectionModel.collection.status;
    this.collectionType = collectionModel.collection.collectionType;
    this.startDate = collectionModel.collection.startDate
      ? collectionModel.collection.startDate
      : null;
    this.endDate = collectionModel.collection.endDate
      ? collectionModel.collection.endDate
      : null;
    this.createdBy = collectionModel.collection.createdBy
      ? new MiniUserOutput(collectionModel.collection.createdBy)
      : null;
    this.parent =
      collectionModel.collection.parentCollection &&
      collectionModel.collection.parentCollection.status ===
        collectionModel.collection.status
        ? new MiniCollectionOutput(
            collectionModel.collection.parentCollection,
            lang,
          )
        : null;
    this.subCollections = collectionModel.collection.subCollections
      ? collectionModel.collection.subCollections.map((subCol) => {
          if (subCol.status === collectionModel.collection.status)
            return new MiniCollectionOutput(subCol, lang);
        })
      : [];
    this.categories = collectionModel.collection.categories
      ? collectionModel.collection.categories.map(
          (category) => new MiniCategoryOutput(category, lang),
        )
      : [];
    this.articles = collectionModel.articles
      ? collectionModel.articles.map(
          (article) => new MiniProductVariantOutput(article, lang),
        )
      : [];
    this.disabledBy = collectionModel.collection.disabledBy
      ? new MiniUserOutput(collectionModel.collection.disabledBy)
      : null;
    this.disabledAt = collectionModel.collection.disabledAt
      ? collectionModel.collection.disabledAt
      : null;
  }

  id: string;
  magentoId?: number;
  title: string;
  description?: string;
  status: Status;
  collectionType: CollectionType;
  startDate?: Date;
  endDate?: Date;
  createdBy?: MiniUserOutput;
  parent?: MiniCollectionOutput;
  subCollections?: MiniCollectionOutput[];
  categories: MiniCategoryOutput[];
  articles?: MiniProductVariantOutput[];
  disabledBy?: MiniUserOutput;
  disabledAt?: Date;
}
