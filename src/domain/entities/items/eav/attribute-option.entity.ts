import { DbBaseEntity } from '@glosuite/shared';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Attribute, AttributeSet } from '.';

@Entity('attribute-option')
export class AttributeOption extends DbBaseEntity {
  @Column({ type: 'boolean', default: true })
  required: boolean;

  @Column()
  attributeId: string;

  @ManyToOne(() => Attribute, (attr) => attr.options)
  @JoinColumn({ name: 'attributeId' })
  attribute: Attribute;

  @Column()
  attributeSetId: string;

  @ManyToOne(() => AttributeSet, (attrSet) => attrSet.options)
  @JoinColumn({ name: 'attributeSetId' })
  attributeSet: AttributeSet;
}
