import { DbBaseEntity } from '@glosuite/shared';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Product } from './product.entity';

@Entity('product-composition')
export class ProductComposition extends DbBaseEntity {
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

  @ManyToOne(() => Product, (product) => product.children)
  @JoinColumn({ name: 'parentId' })
  parent: Product;

  @Column()
  childId: string;

  @ManyToOne(() => Product, (product) => product.parents)
  @JoinColumn({ name: 'childId' })
  child: Product;
}
