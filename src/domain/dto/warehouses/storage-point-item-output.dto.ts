import {
  getLangOrFirstAvailableValue,
  ISOLang,
  SpaceMap,
  StoragePointStatus,
  StoragePointType,
} from '@glosuite/shared';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { MiniUserOutput } from '../auth';
import { AddressItemOutput } from '../shared';

export class StoragePointItemOutput {
  constructor(storagePoint: StoragePoint, lang: ISOLang) {
    this.id = storagePoint.id;
    this.reference = storagePoint.reference;
    this.name = storagePoint.name;
    this.description = storagePoint.description
      ? getLangOrFirstAvailableValue(storagePoint.description, lang)
      : null;
    this.storageType = storagePoint.storageType;
    this.address = new AddressItemOutput(storagePoint.address);
    this.status = storagePoint.status;
    this.allowSales = storagePoint.allowSales;
    this.allowVirtualZones = storagePoint.allowVirtualZones;
    this.space = storagePoint.space ? storagePoint.space : null;
    this.surface = storagePoint.surface ? storagePoint.surface : null;
    this.volume = storagePoint.volume ? storagePoint.volume : null;
    this.createdBy = storagePoint.createdBy
      ? new MiniUserOutput(storagePoint.createdBy)
      : null;
  }

  id: string;
  reference: string;
  name: string;
  description?: string;
  storageType: StoragePointType;
  address: AddressItemOutput;
  status: StoragePointStatus;
  allowSales: boolean;
  allowVirtualZones: boolean;
  space?: SpaceMap;
  surface?: number;
  volume?: number;
  createdBy?: MiniUserOutput;
}
