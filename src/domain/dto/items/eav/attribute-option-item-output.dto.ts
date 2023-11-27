import { ISOLang } from '@glosuite/shared';
import { AttributeOption } from 'src/domain/entities/items/eav';
import { AttributeItemOutput } from '.';

export class AttributeOptionItemOutput {
  constructor(attributeOption: AttributeOption, lang: ISOLang) {
    this.id = attributeOption.id;
    this.required = attributeOption.required;
    this.attribute = new AttributeItemOutput(attributeOption.attribute, lang);
  }

  id: string;
  required: boolean;
  attribute: AttributeItemOutput;
}
