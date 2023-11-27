import {
  getLangOrFirstAvailableValue,
  ISOLang,
  SpaceMap,
} from '@glosuite/shared';
import { MiniUserOutput } from 'src/domain/dto/auth';
import {
  MiniLocationOutput,
  MiniStoragePointOutput,
} from 'src/domain/dto/warehouses';
import { Area, StoragePoint } from 'src/domain/entities/warehouses';
import { AreaType } from 'src/domain/enums/warehouses';

export class GetAreasByStoragePointOutput {
  constructor(
    items: GetAreasByStoragePointAreaOutput[],
    totalItemsCount: number,
    pageIndex: number,
    pageSize: number,
  ) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
  }

  items: GetAreasByStoragePointAreaOutput[];
  totalItemsCount: number;
  pageIndex: number;
  pageSize: number;
}

export class GetAreasByStoragePointAreaOutput {
  constructor(
    area: Area,
    totalVariants: number,
    totalItems: number,
    storagePoint: StoragePoint,
    lang: ISOLang,
  ) {
    this.id = area.id;
    this.reference = area.reference;
    this.title = area.title;
    this.description = area.description
      ? getLangOrFirstAvailableValue(area.description, lang)
      : null;
    this.type = area.type;
    this.isVirtual = area.isVirtual;
    this.space = area.space;
    this.surface = area.surface;
    this.volume = area.volume;
    this.totalItems = totalItems;
    this.totalVariants = totalVariants;
    this.storagePoint = new MiniStoragePointOutput(storagePoint);
    this.locations = area.locations
      ? area.locations.map((location) => new MiniLocationOutput(location, lang))
      : [];
    this.createdBy = area.createdBy ? new MiniUserOutput(area.createdBy) : null;
  }

  id: string;
  reference: string;
  title: string;
  description?: string;
  type: AreaType;
  isVirtual: boolean;
  space?: SpaceMap;
  surface?: number;
  volume?: number;
  totalItems?: number;
  totalVariants?: number;
  storagePoint: MiniStoragePointOutput;
  locations: MiniLocationOutput[];
  createdBy?: MiniUserOutput;
}
