import { ISOLang } from '@glosuite/shared';
import { AttributeOption } from 'src/domain/entities/items/eav';
import { MiniAttributeOutput } from '.';

export class MiniAttributeOptionOutput {
  constructor(attributeOption: AttributeOption, lang: ISOLang) {
    this.required = attributeOption.required;
    this.attribute = new MiniAttributeOutput(attributeOption.attribute, lang);
  }

  required: boolean;
  attribute: MiniAttributeOutput;
}
