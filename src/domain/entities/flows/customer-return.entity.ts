import { DbBaseEntity, UserCon } from '@glosuite/shared';
import {
  CustomerReturnState,
  CustomerReturnStatus,
} from 'src/domain/enums/flows';
import { CommentModel } from 'src/domain/interfaces';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Reception, StockMovement } from '.';
import { ProductItem } from '../items';
import { Order } from '../orders';
import { StoragePoint } from '../warehouses';

@Entity('customer-return')
export class CustomerReturn extends DbBaseEntity {
  @Column({ unique: true })
  reference: string;

  @Column({
    type: 'enum',
    enum: CustomerReturnStatus,
  })
  status: CustomerReturnStatus;

  @Column({
    type: 'enum',
    enum: CustomerReturnState,
  })
  state: CustomerReturnState;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  comments?: CommentModel[];

  @Column({ nullable: true })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.customerReturns)
  @JoinColumn({ name: 'orderId' })
  order?: Order;

  @Column()
  storagePointId: string;

  @ManyToOne(() => StoragePoint, (storage) => storage.customerReturns)
  @JoinColumn({ name: 'storagePointId' })
  storagePoint: StoragePoint;

  @OneToMany(() => StockMovement, (sm) => sm.customerReturn)
  stockMovements: StockMovement[];

  @OneToMany(() => ProductItem, (item) => item.customerReturn)
  productItems: ProductItem[];

  @OneToOne(() => Reception, (reception) => reception.customerReturn)
  reception: Reception;

  @Column({ type: 'simple-json', nullable: true })
  resolvedBy?: UserCon;

  @Column({ nullable: true })
  resolvedAt?: Date;
}
