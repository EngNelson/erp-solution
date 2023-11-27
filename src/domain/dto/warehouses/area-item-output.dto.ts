import {
  getLangOrFirstAvailableValue,
  ISOLang,
  SpaceMap,
} from '@glosuite/shared';
import { Area } from 'src/domain/entities/warehouses';
import { AreaDefaultType, AreaType } from 'src/domain/enums/warehouses';
import { MiniUserOutput } from '../auth';
import { ExtraMiniLocationOutput } from './mini-location-output.dto';
import { ExtraMiniStoragePointOutput } from './mini-storage-point-output.dto';

export class AreaItemOutput {
  constructor(area: Area, lang: ISOLang) {
    this.id = area.id;
    this.reference = area.reference;
    this.title = area.title;
    this.description = area.description
      ? getLangOrFirstAvailableValue(area.description, lang)
      : null;
    this.type = area.type;
    this.defaultType = area.type === AreaType.DEFAULT ? area.defaultType : null;
    this.isVirtual = area.isVirtual;
    this.space = area.space;
    this.surface = area.surface;
    this.volume = area.volume;
    this.storagePoint = new ExtraMiniStoragePointOutput(area.storagePoint);
    this.locations = area.locations
      ? area.locations.map((location) => new ExtraMiniLocationOutput(location))
      : [];
    this.createdBy = area.createdBy ? new MiniUserOutput(area.createdBy) : null;
  }

  id: string;
  reference: string;
  title: string;
  description?: string;
  type: AreaType;
  defaultType?: AreaDefaultType;
  isVirtual: boolean;
  space?: SpaceMap;
  surface?: number;
  volume?: number;
  storagePoint: ExtraMiniStoragePointOutput;
  locations: ExtraMiniLocationOutput[];
  createdBy?: MiniUserOutput;
}
