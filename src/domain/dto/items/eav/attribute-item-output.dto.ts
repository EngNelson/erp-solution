import {
  AttributeType,
  getLangOrFirstAvailableValue,
  ISOLang,
} from '@glosuite/shared';
import { Attribute } from 'src/domain/entities/items/eav';
import { ValueType } from 'src/domain/enums/items';
import { MiniUserOutput } from '../../auth';
import { AttributeValueItemOutput } from './attribute-value-item-output.dto';
import { UnitItemOutput } from './unit-item-output.dto';

export class AttributeItemOutput {
  constructor(attribute: Attribute, lang: ISOLang) {
    this.id = attribute.id;
    this.magentoId = attribute.magentoId ? attribute.magentoId : null;
    this.name = getLangOrFirstAvailableValue(attribute.name, lang);
    this.type = attribute.type;
    this.valueType = attribute.valueType;
    this.hasUnit = attribute.hasUnit;
    this.units = attribute.units
      ? attribute.units.map((unit) => new UnitItemOutput(unit, lang))
      : [];
    this.definedAttributeValues = attribute.definedAttributeValues
      ? attribute.definedAttributeValues.map(
          (definedValue) => new AttributeValueItemOutput(definedValue, lang),
        )
      : [];
    this.createdBy = attribute.createdBy
      ? new MiniUserOutput(attribute.createdBy)
      : null;
    this.createdAt = attribute.createdAt;
    this.updatedAt = attribute.lastUpdate ? attribute.lastUpdate : null;
  }

  id: string;
  magentoId?: number;
  name: string;
  type: AttributeType;
  valueType: ValueType;
  hasUnit: boolean;
  units?: UnitItemOutput[];
  definedAttributeValues?: AttributeValueItemOutput[];
  createdBy?: MiniUserOutput;
  createdAt: Date;
  updatedAt?: Date;
}
