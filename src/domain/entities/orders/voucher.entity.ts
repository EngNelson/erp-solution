import { DbBaseEntity, DiscountType } from '@glosuite/shared';
import { Column, Entity, OneToMany } from 'typeorm';
import { ProductVariant } from '../items';
import { Category, Collection } from '../structures';
import { Order } from './order.entity';

@Entity('voucher')
export class Voucher extends DbBaseEntity {
  @Column({ nullable: true })
  code?: string;

  @Column({
    type: 'enum',
    enum: DiscountType,
  })
  type: DiscountType;

  @Column()
  value: number;

  @Column({ nullable: true })
  startDate?: Date;

  @Column({ nullable: true })
  endDate?: Date;

  @OneToMany(() => ProductVariant, (variant) => variant.specialPrice)
  productVariants?: ProductVariant[];

  @OneToMany(() => Category, (category) => category.discount)
  categories?: Category[];

  @OneToMany(() => Collection, (collection) => collection.discount)
  collections?: Collection[];

  @OneToMany(() => Order, (order) => order.voucher)
  orders: Order[];
}
