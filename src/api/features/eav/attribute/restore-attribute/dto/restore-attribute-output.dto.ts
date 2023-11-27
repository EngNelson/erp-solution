import { getLangOrFirstAvailableValue, ISOLang } from '@glosuite/shared';
import { Attribute } from 'src/domain/entities/items/eav';

export class RestoreAttributeOutput {
  constructor(attribute: Attribute, lang: ISOLang) {
    this.id = attribute.id;
    this.name = getLangOrFirstAvailableValue(attribute.name, lang);
  }

  id: string;
  name: string;
}
