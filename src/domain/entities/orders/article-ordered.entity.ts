import { DbBaseEntity } from '@glosuite/shared';
import { StatusLine } from 'src/domain/enums/flows';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ProductVariant } from '../items';
import { Order } from './order.entity';

@Entity('article-ordered')
export class ArticleOrdered extends DbBaseEntity {
  @Column()
  quantity: number;

  @Column({
    type: 'int',
    default: 0,
  })
  pickedQuantity: number;

  @Column({
    type: 'enum',
    enum: StatusLine,
  })
  status: StatusLine;

  @Column()
  position: number;

  @Column()
  price: number;

  @Column({
    nullable: true,
  })
  discount?: number;

  @Column()
  totalPrice: number;

  @Column()
  orderId: string;

  @ManyToOne(() => Order, (order) => order.articleOrdereds)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  productVariantId: string;

  @ManyToOne(() => ProductVariant, (pv) => pv.articleOrdereds)
  @JoinColumn({ name: 'productVariantId' })
  productVariant: ProductVariant;

  // @Column({ nullable: true })
  // pickingListId?: string;

  // @ManyToOne(() => PickingList, (picking) => picking.articleOrdereds)
  // @JoinColumn({ name: 'pickingListId' })
  // pickingList?: PickingList;
}
