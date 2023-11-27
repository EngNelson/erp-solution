import { DbBaseEntity, TString } from '@glosuite/shared';
import { Column, Entity, ManyToMany, OneToMany } from 'typeorm';
import { ProductVariantAttributeValues } from '../product-variant-attribute-values.entity';
import { AttributeValue } from './attribute-value.entity';
import { Attribute } from './attribute.entity';

@Entity('unit')
export class Unit extends DbBaseEntity {
  @Column({
    type: 'simple-json',
  })
  title: TString;

  @Column({
    unique: true,
  })
  symbol: string;

  @ManyToMany(() => Attribute, (attr) => attr.units)
  attributes: Attribute[];

  @OneToMany(() => ProductVariantAttributeValues, (attrValue) => attrValue.unit)
  variantAttributeValues?: ProductVariantAttributeValues<any>[];

  @OneToMany(() => AttributeValue, (attrValue) => attrValue.unit)
  attributeValues?: AttributeValue[];
}
