import { DbBaseEntity, TString, UserCon } from '@glosuite/shared';
import { TransfertStatus, TransfertType } from 'src/domain/enums/flows';
import { CommentModel } from 'src/domain/interfaces';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { StockMovement } from '.';
import { Order } from '../orders';
import { StoragePoint } from '../warehouses';
import { MobileUnit } from './mobile-unit.entity';
import { VariantTransfert } from './variant-transfert.entity';
import { PurchaseOrder } from '../purchases';

@Entity('transfert')
export class Transfert extends DbBaseEntity {
  @Column({ unique: true })
  reference: string;

  @Column({
    type: 'enum',
    enum: TransfertType,
  })
  type: TransfertType;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  description?: TString;

  @Column({
    type: 'boolean',
  })
  isRequest: boolean;

  @Column({
    type: 'enum',
    enum: TransfertStatus,
    default: TransfertStatus.PENDING,
  })
  status: TransfertStatus;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  comments?: CommentModel[];

  @Column({ type: 'simple-json', nullable: true })
  confirmedBy?: UserCon;

  @Column({ type: 'simple-json', nullable: true })
  validatedBy?: UserCon;

  @Column({ type: 'simple-json', nullable: true })
  canceledBy?: UserCon;

  @Column()
  sourceId: string;

  @ManyToOne(() => StoragePoint, (sp) => sp.incomingTransferts)
  @JoinColumn({ name: 'sourceId' })
  source: StoragePoint;

  @Column()
  targetId: string;

  @ManyToOne(() => StoragePoint, (sp) => sp.outgoingTransferts)
  @JoinColumn({ name: 'targetId' })
  target: StoragePoint;

  @Column({ nullable: true })
  orderId?: string;

  @ManyToOne(() => Order, (order) => order.transferts)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @OneToOne(() => Transfert, (transfert) => transfert.parent)
  child?: Transfert;

  @OneToOne(() => Transfert, (transfert) => transfert.child)
  @JoinColumn()
  parent?: Transfert;

  @OneToOne(() => PurchaseOrder, (po) => po.transfert)
  purchaseOrder?: PurchaseOrder;

  @OneToMany(() => MobileUnit, (mu) => mu.transfert)
  mobileUnits: MobileUnit[];

  @OneToMany(() => VariantTransfert, (vt) => vt.transfert)
  variantTransferts: VariantTransfert[];

  @OneToMany(() => StockMovement, (sm) => sm.transfert)
  stockMovements: StockMovement[];

  // @OneToOne(() => PickingList, (pickingList) => pickingList.transfert)
  // pickingList?: PickingList;
}
