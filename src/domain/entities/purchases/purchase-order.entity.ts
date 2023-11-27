import { DbBaseEntity, UserCon } from '@glosuite/shared';
import { OperationStatus } from 'src/domain/enums/flows';
import { PurchaseOrderFor, PurchaseType } from 'src/domain/enums/purchases';
import { CommentModel, MiniUserPayload } from 'src/domain/interfaces';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { InternalNeed, Reception, Transfert } from '../flows';
import { Order } from '../orders';
import { StoragePoint } from '../warehouses';
import { VariantPurchased } from './variant-purchased.entity';

@Entity('purchase-order')
export class PurchaseOrder extends DbBaseEntity {
  @Column({ unique: true })
  reference: string;

  @Column({
    type: 'enum',
    enum: OperationStatus,
    default: OperationStatus.PENDING,
  })
  status: OperationStatus;

  @Column({
    type: 'enum',
    enum: PurchaseType,
    nullable: true,
  })
  type?: PurchaseType;

  @Column({
    type: 'enum',
    enum: PurchaseOrderFor,
    nullable: true,
  })
  purchaseFor?: PurchaseOrderFor;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  comments?: CommentModel[];

  @Column({ nullable: true })
  assignTo?: string; // user id

  @Column({ type: 'simple-json', nullable: true })
  assignedTo?: MiniUserPayload;

  @Column({ type: 'simple-json', nullable: true })
  validatedBy?: UserCon;

  @Column({ type: 'simple-json', nullable: true })
  canceledBy?: UserCon;

  @OneToOne(() => PurchaseOrder, (po) => po.parent)
  child?: PurchaseOrder;

  @OneToOne(() => PurchaseOrder, (po) => po.child)
  @JoinColumn()
  parent?: PurchaseOrder;

  @OneToMany(() => Reception, (r) => r.purchaseOrder)
  receptions?: Reception[];

  @OneToOne(() => Order, (order) => order.purchaseOrder)
  @JoinColumn()
  order?: Order;

  // Used for filtering
  @Column({ nullable: true })
  orderRef?: string;

  @OneToMany(() => VariantPurchased, (vp) => vp.purchaseOrder)
  variantPurchaseds: VariantPurchased[];

  @OneToOne(() => InternalNeed, (need) => need.purchaseOrder)
  @JoinColumn()
  internalNeed?: InternalNeed;

  @OneToOne(() => Transfert, (transfert) => transfert.purchaseOrder)
  @JoinColumn()
  transfert?: Transfert;

  @Column({ nullable: true })
  storagePointId?: string;

  @ManyToOne(() => StoragePoint, (storage) => storage.purchaseOrders)
  @JoinColumn({ name: 'storagePointId' })
  storagePoint?: StoragePoint;
}
