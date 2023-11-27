import { getLangOrFirstAvailableValue, ISOLang } from '@glosuite/shared';
import { Area } from 'src/domain/entities/warehouses';
import { AreaDefaultType, AreaType } from 'src/domain/enums/warehouses';

export class MiniAreaOutput {
  constructor(area: Area, lang: ISOLang) {
    this.id = area.id;
    this.reference = area.reference;
    this.title = area.title;
    this.description = area.description
      ? getLangOrFirstAvailableValue(area.description, lang)
      : null;
    this.type = area.type;
    this.defaultType = area.type === AreaType.DEFAULT ? area.defaultType : null;
  }

  id: string;
  reference: string;
  title: string;
  description?: string;
  type: AreaType;
  defaultType?: AreaDefaultType;
}
