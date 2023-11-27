import { DbBaseEntity } from '@glosuite/shared';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Order } from '../orders';
import { StoragePoint } from '../warehouses';
import { AmountByMethod, CashedAlert } from 'src/domain/interfaces/finance';

@Entity('counters')
export class Counter extends DbBaseEntity {
  @Column()
  name: string;

  @Column({
    unique: true,
  })
  reference: string;

  @Column()
  amountExpected: number;

  @Column()
  amountCollected: number;

  @Column({
    type: 'simple-json',
  })
  amountsByMethod: AmountByMethod[];

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  alert?: CashedAlert;

  @Column()
  cashierId: string;

  @Column({
    nullable: true,
  })
  storagePointId?: string;

  @ManyToOne(() => StoragePoint, (wh) => wh.counters)
  @JoinColumn({ name: 'storagePointId' })
  storagePoint?: StoragePoint;

  @OneToMany(() => Order, (order) => order.counter)
  orders: Order[];
}
