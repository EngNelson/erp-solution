import {
  getLangOrFirstAvailableValue,
  SpaceMap,
  ValueMap,
} from '@glosuite/shared';
import { ISOLang } from '@glosuite/shared';
import { Location } from 'src/domain/entities/warehouses';
import { AreaType, LocationDefaultType } from 'src/domain/enums/warehouses';

export class MiniLocationOutput {
  constructor(location: Location, lang: ISOLang) {
    this.id = location.id;
    this.reference = location.reference;
    this.name = location.name;
    this.description = location.description
      ? getLangOrFirstAvailableValue(location.description, lang)
      : null;
    this.type = location.type;
    this.defaultType =
      location.type === AreaType.DEFAULT ? location.defaultType : null;
    this.barCode = location.barCode;
    this.totalItems = location.totalItems;
    this.isVirtual = location.isVirtual;
    this.isProviderDedicated = location.isProviderDedicated;
    this.dedicatedSupplier = location.dedicatedSupplier;
    this.space = location.space;
    this.surface = location.surface;
    this.volume = location.volume;
  }

  id: string;
  reference: string;
  name: string;
  description?: string;
  type: AreaType;
  defaultType?: LocationDefaultType;
  barCode: string;
  totalItems: number;
  isVirtual: boolean;
  isProviderDedicated: boolean;
  dedicatedSupplier?: ValueMap;
  space?: SpaceMap;
  surface?: number;
  volume?: number;
}

export class ExtraMiniLocationOutput {
  constructor(location: Location) {
    this.id = location.id;
    this.reference = location.reference;
    this.name = location.name;
    this.type = location.type;
  }

  id: string;
  reference: string;
  name: string;
  type: AreaType;
}
