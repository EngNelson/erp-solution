import { TString } from '@glosuite/shared';
import { AttributeValueType } from 'src/domain/types/catalog/eav';

export class AttributeValueOutput {
  constructor(definedAttributeValue: AttributeValueType) {
    this.code = definedAttributeValue.code ? definedAttributeValue.code : null;
    this.value = definedAttributeValue.value;
  }

  code?: string;
  value: TString | string | number;
}
