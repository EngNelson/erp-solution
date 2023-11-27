import { AttributeType, DbBaseEntity, TString } from '@glosuite/shared';
import { ValueType } from 'src/domain/enums/items';
import { Column, Entity, JoinTable, ManyToMany, OneToMany } from 'typeorm';
import { AttributeOption, Unit } from '.';
import { ProductVariantAttributeValues } from '..';
import { AttributeValue } from './attribute-value.entity';

@Entity('attribute')
export class Attribute extends DbBaseEntity {
  @Column({
    nullable: true,
  })
  magentoId?: number;

  @Column({ type: 'simple-json' })
  name: TString;

  @Column({ type: 'enum', enum: AttributeType })
  type: AttributeType;

  @Column({
    type: 'enum',
    enum: ValueType,
  })
  valueType: ValueType;

  @Column({ type: 'boolean', default: true })
  hasUnit: boolean;

  @ManyToMany(() => Unit, (unit) => unit.attributes)
  @JoinTable()
  units?: Unit[];

  @OneToMany(() => AttributeOption, (option) => option.attribute)
  options: AttributeOption[];

  @OneToMany(
    () => ProductVariantAttributeValues,
    (attrValue) => attrValue.attribute,
  )
  variantAttributeValues: ProductVariantAttributeValues<any>[];

  @OneToMany(() => AttributeValue, (attrValue) => attrValue.attribute)
  definedAttributeValues?: AttributeValue[];

  @Column({
    nullable: true,
    type: Date,
  })
  magentoCreatedAt?: Date;

  @Column({
    nullable: true,
    type: Date,
  })
  magentoUpdatedAt?: Date;
}
