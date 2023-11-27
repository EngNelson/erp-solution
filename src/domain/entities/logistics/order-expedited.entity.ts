import { DbBaseEntity } from '@glosuite/shared';
import { Column, Entity, JoinColumn, ManyToOne, } from 'typeorm';
import { ExpeditionStatus } from 'src/domain/enums/logistics';
import { Order } from '../orders/order.entity'
import { Expedition } from './expedition.entity';


@Entity('order-expedited')
export class OrderExpedited extends DbBaseEntity {
 
  @Column({
    type: 'enum',
    enum: ExpeditionStatus,
  })
  status: ExpeditionStatus;

 @Column()
  orderId: string;



  @ManyToOne(() => Order, (order) => order.ordersExpedited)
  @JoinColumn({name: 'orderId'})
  order: Order;

  @Column()
  expeditionId: string;

  @ManyToOne(() => Expedition, (expedition) => expedition.ordersExpedited)
  @JoinColumn({ name: 'expeditionId'})
  expedition: Expedition;


}
