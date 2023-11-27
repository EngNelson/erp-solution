import { ISOLang } from '@glosuite/shared';
import { ProductVariantAttributeValues } from 'src/domain/entities/items';
import { Unit } from 'src/domain/entities/items/eav';
import { MiniAttributeOutput, UnitItemOutput } from './eav';

export class VariantAttributeValueItemOutput {
  constructor(
    variantAttributeValue: ProductVariantAttributeValues<any>,
    attribute: MiniAttributeOutput,
    value: any,
    valueUnit: Unit,
    lang: ISOLang,
  ) {
    this.variantAttributeValueId = variantAttributeValue.id;
    this.attribute = attribute;
    this.value = value;
    this.valueUnit = valueUnit ? new UnitItemOutput(valueUnit, lang) : null;
  }

  variantAttributeValueId: string;
  attribute: MiniAttributeOutput;
  value: any;
  valueUnit?: UnitItemOutput;
}
