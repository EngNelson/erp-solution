import { ProductVariantAttributeValues } from 'src/domain/entities/items';
import { Attribute, Unit } from 'src/domain/entities/items/eav';

export type VariantAttributeValueModel<T> = {
  variantAttributeValue?: ProductVariantAttributeValues<T>;
  attribute?: Attribute;
  value: T;
  unit?: Unit;
};
