import { DbBaseEntity } from '@glosuite/shared';
import { AttributeValueType } from 'src/domain/types/catalog/eav';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Attribute } from './attribute.entity';
import { Unit } from './unit.entity';

@Entity('attribute-value')
export class AttributeValue extends DbBaseEntity {
  @Column({
    nullable: true,
  })
  magentoId?: number;

  @Column({
    type: 'simple-json',
  })
  value: AttributeValueType;

  @Column()
  attributeId: string;

  @ManyToOne(() => Attribute, (attr) => attr.definedAttributeValues)
  @JoinColumn({ name: 'attributeId' })
  attribute: Attribute;

  @Column({ nullable: true })
  unitId?: string;

  @ManyToOne(() => Unit, (unit) => unit.attributeValues)
  @JoinColumn({ name: 'unitId' })
  unit?: Unit;

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
