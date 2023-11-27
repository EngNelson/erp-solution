import {
  getLangOrFirstAvailableValue,
  ISOLang,
  SpaceMap,
  StoragePointStatus,
  StoragePointType,
  ValueMap,
} from '@glosuite/shared';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import { AreaType } from 'src/domain/enums/warehouses';
import { MiniUserOutput } from '../auth';
import { MiniAddressOutput } from '../shared';

export class StoragePointTreeOutput {
  constructor(storagePoint: StoragePoint, lang: ISOLang) {
    this.id = storagePoint.id;
    this.reference = storagePoint.reference;
    this.title = storagePoint.name;
    this.description = storagePoint.description
      ? getLangOrFirstAvailableValue(storagePoint.description, lang)
      : null;
    this.storageType = storagePoint.storageType;
    this.address = new MiniAddressOutput(storagePoint.address);
    this.status = storagePoint.status;
    this.allowSales = storagePoint.allowSales;
    this.allowVirtualZones = storagePoint.allowVirtualZones;
    this.space = storagePoint.space ? storagePoint.space : null;
    this.surface = storagePoint.surface ? storagePoint.surface : null;
    this.volume = storagePoint.volume ? storagePoint.volume : null;
    this.areas =
      storagePoint.areas.length > 0
        ? storagePoint.areas.map(
            (area) => new StoragePointTreeAreaTreeOutput(area, lang),
          )
        : [];
    this.createdBy = storagePoint.createdBy
      ? new MiniUserOutput(storagePoint.createdBy)
      : null;
  }

  id: string;
  reference: string;
  title: string;
  description?: string;
  storageType: StoragePointType;
  address: MiniAddressOutput;
  status: StoragePointStatus;
  allowSales: boolean;
  allowVirtualZones: boolean;
  space?: SpaceMap;
  surface?: number;
  volume?: number;
  areas?: StoragePointTreeAreaTreeOutput[];
  createdBy?: MiniUserOutput;
}

class StoragePointTreeAreaTreeOutput {
  constructor(area: Area, lang: ISOLang) {
    this.id = area.id;
    this.reference = area.reference;
    this.type = area.type;
    this.title = area.title;
    this.description = area.description
      ? getLangOrFirstAvailableValue(area.description, lang)
      : null;
    this.space = area.space;
    this.isVirtual = area.isVirtual;
    this.surface = area.surface;
    this.volume = area.volume;
    this.locations = area.locations
      ? area.locations.map(
          (location) => new StoragePointTreeLocationTreeOutput(location, lang),
        )
      : [];
  }

  id: string;
  reference: string;
  type: AreaType;
  title: string;
  description?: string;
  space: SpaceMap;
  isVirtual: boolean;
  surface?: number;
  volume?: number;
  locations: StoragePointTreeLocationTreeOutput[];
}

class StoragePointTreeLocationTreeOutput {
  constructor(location: Location, lang: ISOLang) {
    this.id = location.id;
    this.reference = location.reference;
    this.barCode = location.barCode;
    this.description = location.description
      ? getLangOrFirstAvailableValue(location.description, lang)
      : null;
    this.type = location.type;
    this.surface = location.surface ? location.surface : null;
    this.volume = location.volume ? location.volume : null;
    this.totalItems = location.totalItems ? location.totalItems : 0;
    this.isVirtual = location.isVirtual;
    this.isProviderDedicted = location.isProviderDedicated;
    this.dedicatedSupplier = location.isProviderDedicated
      ? location.dedicatedSupplier
      : null;
    this.space = location.space ? location.space : null;
    this.name = location.name;
    this.parentLocation = location.parentLocation
      ? new StoragePointTreeLocationTreeOutput(location.parentLocation, lang)
      : null;
    this.children = location.children
      ? location.children.map(
          (child) => new StoragePointTreeLocationTreeOutput(child, lang),
        )
      : [];
  }

  id: string;
  reference: string;
  barCode: string;
  name: string;
  description?: string;
  type: AreaType;
  surface?: number;
  volume?: number;
  totalItems?: number;
  isVirtual: boolean;
  isProviderDedicted: boolean;
  dedicatedSupplier?: ValueMap;
  space?: SpaceMap;
  parentLocation?: StoragePointTreeLocationTreeOutput;
  children: StoragePointTreeLocationTreeOutput[];
}
