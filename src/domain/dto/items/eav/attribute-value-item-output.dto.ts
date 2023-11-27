import { ISOLang } from '@glosuite/shared';
import { AttributeValue } from 'src/domain/entities/items/eav';
import { AttributeValueOutput } from './attribute-value-output.dto';
import { UnitItemOutput } from './unit-item-output.dto';

export class AttributeValueItemOutput {
  constructor(attributeValue: AttributeValue, lang: ISOLang) {
    this.id = attributeValue.id;
    this.magentoId = attributeValue.magentoId ? attributeValue.magentoId : null;
    this.value = attributeValue.value
      ? new AttributeValueOutput(attributeValue.value)
      : null;
    this.unit = attributeValue.unit
      ? new UnitItemOutput(attributeValue.unit, lang)
      : null;
  }

  id: string;
  magentoId?: number;
  value: AttributeValueOutput;
  unit?: UnitItemOutput;
}
