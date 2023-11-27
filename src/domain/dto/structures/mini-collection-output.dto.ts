import {
  CollectionType,
  getLangOrFirstAvailableValue,
  ISOLang,
  Status,
} from '@glosuite/shared';
import { Collection } from 'src/domain/entities/structures';

export class MiniCollectionOutput {
  constructor(collection: Collection, lang: ISOLang) {
    this.id = collection.id;
    this.magentoId = collection.magentoId ? collection.magentoId : null;
    this.title = getLangOrFirstAvailableValue(collection.title, lang);
    this.description = collection.description
      ? getLangOrFirstAvailableValue(collection.description, lang)
      : null;
    this.status = collection.status;
    this.collectionType = collection.collectionType;
  }

  id: string;
  magentoId?: number;
  title: string;
  description?: string;
  status: Status;
  collectionType: CollectionType;
}
