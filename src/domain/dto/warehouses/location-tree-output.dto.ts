import {
  CurrencyMap,
  getLangOrFirstAvailableValue,
  ISOLang,
  SpaceMap,
  ValueMap,
} from '@glosuite/shared';
import { Location } from 'src/domain/entities/warehouses';
import { AreaType, LocationDefaultType } from 'src/domain/enums/warehouses';
import { MiniAreaOutput } from './mini-area-output.dto';
import { MiniLocationOutput } from './mini-location-output.dto';

export class LocationTreeOutput {
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
    this.space = location.space ? location.space : null;
    this.isProviderDedicated = location.isProviderDedicated;
    this.isVirtual = location.isVirtual;
    this.dedicatedSupplier = location.dedicatedSupplier;
    this.totalItems = location.totalItems;
    this.stockValue = location.stockValue;
    this.area = location.area ? new MiniAreaOutput(location.area, lang) : null;
    this.parentLocation = location.parentLocation
      ? new MiniLocationOutput(location.parentLocation, lang)
      : null;
    this.children = location.children
      ? location.children.map(
          (child) => new LocationTreeLocationTreeOutput(child, lang),
        )
      : [];
  }

  id: string;
  reference: string;
  name: string;
  description?: string;
  type: AreaType;
  defaultType?: LocationDefaultType;
  space?: SpaceMap;
  isProviderDedicated?: boolean;
  isVirtual?: boolean;
  dedicatedSupplier?: ValueMap;
  totalItems?: number;
  stockValue?: CurrencyMap[];
  area: MiniAreaOutput;
  parentLocation?: MiniLocationOutput;
  children: LocationTreeLocationTreeOutput[];
}

class LocationTreeLocationTreeOutput {
  constructor(location: Location, lang: ISOLang) {
    this.id = location.id;
    this.reference = location.reference;
    this.barCode = location.barCode;
    this.name = location.name;
    this.description = location.description
      ? getLangOrFirstAvailableValue(location.description, lang)
      : null;
    this.type = location.type;
    this.defaultType =
      location.type === AreaType.DEFAULT ? location.defaultType : null;
    this.space = location.space ? location.space : null;
    this.surface = location.surface ? location.surface : null;
    this.volume = location.volume ? location.volume : null;
    this.totalItems = location.totalItems ? location.totalItems : 0;
    this.isVirtual = location.isVirtual;
    this.isProviderDedicted = location.isProviderDedicated;
    this.dedicatedSupplier = location.dedicatedSupplier
      ? location.dedicatedSupplier
      : null;
    this.children = location.children
      ? location.children.map(
          (child) => new LocationTreeLocationTreeOutput(child, lang),
        )
      : [];
  }

  id: string;
  reference: string;
  barCode: string;
  name: string;
  description?: string;
  type: AreaType;
  defaultType?: LocationDefaultType;
  space?: SpaceMap;
  surface?: number;
  volume?: number;
  totalItems?: number;
  isVirtual: boolean;
  isProviderDedicted: boolean;
  dedicatedSupplier?: ValueMap;
  children: LocationTreeLocationTreeOutput[];
}
