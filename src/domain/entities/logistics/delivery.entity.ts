import { Entity, Column, OneToMany } from 'typeorm';
import { DeliveryStatus, TransportationMeans } from 'src/domain/enums/logistics';
import { DbBaseEntity } from '@glosuite/shared/dist/src/shared';
import { Order } from '../orders';



@Entity('deliveries')
export class Delivery extends DbBaseEntity {


  @Column({
    type: 'enum',
    enum: DeliveryStatus,
  })
  status: DeliveryStatus;

  @Column({
    type: 'enum',
    enum: TransportationMeans,
  })
  transportation: TransportationMeans;


  @Column()
  orderId: string;

  @Column({ type: String, nullable: true })
  agentId?: string;

  @OneToMany(() => Order, (order) => order.delivery)
  orders: Order[];


}
