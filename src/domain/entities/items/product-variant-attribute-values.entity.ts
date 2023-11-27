import { DbBaseEntity } from '@glosuite/shared';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ProductVariant } from '.';
import { Attribute, Unit } from './eav';

@Entity('variant-attribute-values')
export class ProductVariantAttributeValues<T> extends DbBaseEntity {
  @Column({ nullable: true, type: 'simple-json' })
  value: T;

  @Column()
  attributeId: string;

  @ManyToOne(() => Attribute, (attr) => attr.variantAttributeValues)
  @JoinColumn({ name: 'attributeId' })
  attribute: Attribute;

  @Column()
  variantId: string;

  @ManyToOne(() => ProductVariant, (variant) => variant.attributeValues)
  @JoinColumn({ name: 'variantId' })
  productVariant: ProductVariant;

  @Column({ nullable: true })
  unitId?: string;

  @ManyToOne(() => Unit, (unit) => unit.variantAttributeValues)
  @JoinColumn({ name: 'unitId' })
  unit?: Unit;
}
