import { DbBaseEntity } from '@glosuite/shared';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ProductVariant } from './product-variant.entity';

@Entity('variant-composition')
export class VariantComposition extends DbBaseEntity {
  @Column('boolean')
  required: boolean;

  @Column()
  defaultQuantity: number;

  @Column({
    nullable: true,
  })
  position?: number;

  @Column()
  parentId: string;

  @ManyToOne(() => ProductVariant, (variant) => variant.children)
  @JoinColumn({ name: 'parentId' })
  parent: ProductVariant;

  @Column()
  childId: string;

  @ManyToOne(() => ProductVariant, (variant) => variant.parents)
  @JoinColumn({ name: 'childId' })
  child: ProductVariant;
}
