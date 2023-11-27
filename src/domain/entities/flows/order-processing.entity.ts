import { DbBaseEntity } from '@glosuite/shared';
import { StepStatus } from 'src/domain/enums/flows';
import { OrderStep } from 'src/domain/enums/orders';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Order } from '../orders';

@Entity('order-processing')
export class OrderProcessing extends DbBaseEntity {
  @Column()
  reference: string;

  @Column({
    type: 'enum',
    enum: OrderStep,
  })
  state: OrderStep;

  @Column({
    type: 'enum',
    enum: StepStatus,
  })
  status: StepStatus;

  @Column({
    type: 'datetime',
  })
  startDate: Date;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  endDate?: Date;

  @Column()
  orderId: string;

  @ManyToOne(() => Order, (order) => order.orderProcessings)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  // @OneToOne(() => PickingList, (picking) => picking.orderProcessing)
  // pickingList?: PickingList;
}
