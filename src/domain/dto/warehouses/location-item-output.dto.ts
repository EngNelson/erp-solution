import {
  getLangOrFirstAvailableValue,
  ISOLang,
  SpaceMap,
  ValueMap,
} from '@glosuite/shared';
import { Location } from 'src/domain/entities/warehouses';
import { AreaType, LocationDefaultType } from 'src/domain/enums/warehouses';
import { MiniAreaOutput, MiniLocationOutput } from '.';
import { MiniUserOutput } from '../auth';

export class LocationItemOutput {
  constructor(location: Location, totalVariants: number, lang: ISOLang) {
    this.id = location.id;
    this.name = location.name;
    this.description = location.description
      ? getLangOrFirstAvailableValue(location.description, lang)
      : null;
    this.barCode = location.barCode;
    this.type = location.type;
    this.defaultType =
      location.type === AreaType.DEFAULT ? location.defaultType : null;
    this.isVirtual = location.isVirtual;
    this.isProviderDedicated = location.isProviderDedicated;
    this.dedicatedSupplier = location.isProviderDedicated
      ? location.dedicatedSupplier
      : null;
    this.space = location.space ? location.space : null;
    this.surface = location.surface;
    this.volume = location.volume;
    this.totalItems = location.totalItems;
    this.totalVariants = totalVariants;
    this.area = location.area ? new MiniAreaOutput(location.area, lang) : null;
    this.parentLocation = location.parentLocation
      ? new MiniLocationOutput(location.parentLocation, lang)
      : null;
    this.children = location.children
      ? location.children.map((child) => new MiniLocationOutput(child, lang))
      : [];
    this.createdBy = location.createdBy
      ? new MiniUserOutput(location.createdBy)
      : null;
  }

  id: string;
  name: string;
  description?: string;
  barCode: string;
  type: AreaType;
  defaultType?: LocationDefaultType;
  isVirtual: boolean;
  isProviderDedicated: boolean;
  dedicatedSupplier?: ValueMap;
  space?: SpaceMap;
  surface?: number;
  volume?: number;
  totalItems: number;
  totalVariants: number;
  area?: MiniAreaOutput;
  parentLocation?: MiniLocationOutput;
  children: MiniLocationOutput[];
  createdBy?: MiniUserOutput;
}
