import { DbBaseEntity, MiniUserCon } from '@glosuite/shared/dist/src/shared';
import { ExpeditionStatus } from 'src/domain/enums/logistics';
import { Entity, Column, JoinColumn, OneToMany, ManyToOne, OneToOne, ManyToMany } from 'typeorm';
import { Packages } from './package.entity';
import { StoragePoint } from '../warehouses/storage-point.entity';
import { Order } from '../orders';
import { Reception } from '../flows';
import { OrderExpedited } from './order-expedited.entity';
import { MiniUserPayload } from 'src/domain/interfaces';


@Entity('expeditions')
export class Expedition extends DbBaseEntity {
  
  @Column({
    unique: true,
  })
  reference: string;

  @Column({
    nullable: true,
  })
  destination?: string;


  @Column({
    type: 'enum',
    enum: ExpeditionStatus,
  })
  status: ExpeditionStatus;

  @Column({ type: 'simple-json', nullable: true })
  sentBy?: MiniUserPayload;

  @Column({ nullable: true })
  sentAt?: Date;

  
  @Column({ type: 'simple-json', nullable: true })
  recievedBy?: MiniUserPayload;

  @Column({ nullable: true })
  recievedAt?: Date;

  @Column({
    nullable: true,
  })
  storagePointId?: String;

  @ManyToOne(() => StoragePoint, (storagePoint) => storagePoint.expeditions)
  @JoinColumn({ name: 'storagePointId' })
  storagePoint?: StoragePoint;  

  @OneToOne(() => Reception, (reception) => reception.expedition)
  @JoinColumn()
  reception: Reception;

  
  @OneToMany(() => OrderExpedited, (orderExpedited) => orderExpedited.expedition)
  ordersExpedited: OrderExpedited[];

  @OneToMany(() => Packages, (packages) => packages.expedition)
  packages: Packages[];


}



