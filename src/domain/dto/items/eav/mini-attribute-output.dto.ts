import {
  AttributeType,
  getLangOrFirstAvailableValue,
  ISOLang,
} from '@glosuite/shared';
import { Attribute } from 'src/domain/entities/items/eav';
import { ValueType } from 'src/domain/enums/items';

export class MiniAttributeOutput {
  constructor(attribute: Attribute, lang: ISOLang) {
    this.id = attribute.id;
    // this.magentoId = attribute.magentoId ? attribute.magentoId : null;
    this.name = getLangOrFirstAvailableValue(attribute.name, lang);
    this.type = attribute.type;
    this.valueType = attribute.valueType;
    // this.hasUnit = attribute.hasUnit;
    // this.units = attribute.units
    //   ? attribute.units.map((unit) => new UnitItemOutput(unit, lang))
    //   : [];
    // this.definedAttributeValues = attribute.definedAttributeValues
    //   ? attribute.definedAttributeValues.map(
    //       (definedValue) => new AttributeValueItemOutput(definedValue, lang),
    //     )
    //   : [];
  }

  id: string;
  // magentoId?: number;
  name: string;
  type: AttributeType;
  valueType: ValueType;
  // hasUnit: boolean;
  // units?: UnitItemOutput[];
  // definedAttributeValues?: AttributeValueItemOutput[];
}
