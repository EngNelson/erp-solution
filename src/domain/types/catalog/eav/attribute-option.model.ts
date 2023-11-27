import { Attribute, AttributeOption } from 'src/domain/entities/items/eav';

export type AttributeOptionModel = {
  attributeOption?: AttributeOption;
  attribute: Attribute;
  required: boolean;
};
