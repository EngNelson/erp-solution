import { AttributeType } from '@glosuite/shared';
import { Unit } from 'src/domain/entities/items/eav';
import { ValueType } from 'src/domain/enums/items';
import { DefinedAttributeValues } from './i.defined-attribute-values';

export interface AttributeData {
  type: AttributeType;
  valueType: ValueType;
  hasUnit: boolean;
  definedAttributeValues: DefinedAttributeValues[];
  units?: Unit[];
}
