import {
  getLangOrFirstAvailableValue,
  ISOLang,
  SpaceMap,
} from '@glosuite/shared';
import { Area, Location } from 'src/domain/entities/warehouses';
import {
  AreaDefaultType,
  AreaType,
  LocationDefaultType,
} from 'src/domain/enums/warehouses';

export class AreaTreeOutput {
  constructor(area: Area, lang: ISOLang) {
    this.id = area.id;
    this.reference = area.reference;
    this.type = area.type;
    this.title = area.title;
    this.description = area.description
      ? getLangOrFirstAvailableValue(area.description, lang)
      : null;
    this.defaultType = area.type === AreaType.DEFAULT ? area.defaultType : null;
    this.space = area.space ? area.space : null;
    this.surface = area.surface ? area.surface : null;
    this.volume = area.volume ? area.volume : null;
    this.isVirtual = area.isVirtual;
    this.locations = area.locations
      ? area.locations.map(
          (location) => new AreaTreeLocationTreeOutput(location, lang),
        )
      : [];
  }

  id: string;
  reference: string;
  type: AreaType;
  title: string;
  description?: string;
  defaultType?: AreaDefaultType;
  space?: SpaceMap;
  surface?: number;
  volume?: number;
  isVirtual: boolean;
  locations: AreaTreeLocationTreeOutput[];
}

class AreaTreeLocationTreeOutput {
  constructor(location: Location, lang: ISOLang) {
    this.id = location.id;
    this.reference = location.reference;
    this.barCode = location.barCode;
    this.description = location.description
      ? getLangOrFirstAvailableValue(location.description, lang)
      : null;
    this.type = location.type;
    this.defaultType =
      location.type === AreaType.DEFAULT ? location.defaultType : null;
    this.surface = location.surface ? location.surface : null;
    this.volume = location.volume ? location.volume : null;
    this.totalItems = location.totalItems ? location.totalItems : 0;
    this.isVirtual = location.isVirtual;
    this.isProviderDedicted = location.isProviderDedicated;
    this.name = location.name;
    this.children = location.children
      ? location.children.map(
          (child) => new AreaTreeLocationTreeOutput(child, lang),
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
  surface?: number;
  volume?: number;
  totalItems?: number;
  isVirtual: boolean;
  isProviderDedicted: boolean;
  children: AreaTreeLocationTreeOutput[];
}
