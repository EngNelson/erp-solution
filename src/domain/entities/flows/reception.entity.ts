import { DbBaseEntity, UserCon } from '@glosuite/shared';
import { OperationStatus, ReceptionType } from 'src/domain/enums/flows';
import { CommentModel } from 'src/domain/interfaces';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { ProductItem } from '../items';
import { PurchaseOrder } from '../purchases';
import { StoragePoint } from '../warehouses';
import { Investigation } from './investigation.entity';
import { MobileUnit } from './mobile-unit.entity';
import { OtherOutput } from './other-output.entity';
import { StockMovement } from './stock-movement.entity';
import { VariantReception } from './variant-reception.entity';
import { CustomerReturn } from './customer-return.entity';
import { Order } from '../orders';
import { Expedition, Packages } from '../logistics';

@Entity('reception')
export class Reception extends DbBaseEntity {
  @Column()
  reference: string;

  @Column({
    type: 'enum',
    enum: ReceptionType,
  })
  type: ReceptionType;

  @Column({
    type: 'enum',
    enum: OperationStatus,
    default: OperationStatus.PENDING,
  })
  status: OperationStatus;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  comments?: CommentModel[];

  @Column({
    nullable: true,
  })
  cancelReason?: string;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  validatedBy?: UserCon;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  canceledBy?: UserCon;

  @Column()
  storagePointId: string;

  @ManyToOne(() => StoragePoint, (storage) => storage.receptions)
  @JoinColumn({ name: 'storagePointId' })
  storagePoint: StoragePoint;

  @OneToOne(() => Reception, (r) => r.child)
  @JoinColumn()
  parent?: Reception;

  @OneToOne(() => Reception, (r) => r.parent)
  child?: Reception;

  @OneToMany(() => VariantReception, (vr) => vr.reception)
  variantReceptions?: VariantReception[];

  @OneToMany(() => StockMovement, (sm) => sm.reception)
  stockMovements?: StockMovement[];

  @OneToMany(() => MobileUnit, (mu) => mu.reception)
  mobileUnits?: MobileUnit[];

  @Column({ nullable: true })
  purchaseOrderId?: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.receptions)
  @JoinColumn({ name: 'purchaseOrderId' })
  purchaseOrder?: PurchaseOrder;

  @OneToOne(() => CustomerReturn, (cr) => cr.reception)
  @JoinColumn()
  customerReturn?: CustomerReturn;

  @OneToOne(() => OtherOutput, (output) => output.reception)
  @JoinColumn()
  otherOutput?: OtherOutput;

  @OneToOne(() => Investigation, (investigation) => investigation.reception)
  @JoinColumn()
  investigation?: Investigation;

  @OneToMany(() => ProductItem, (item) => item.reception)
  productItems?: ProductItem[];

  @Column({ nullable: true })
  orderId?: string;

  @ManyToOne(() => Order, (order) => order.receptions)
  @JoinColumn({ name: 'orderId' })
  order?: Order;


  // Start Logistics

  @OneToOne(() => Expedition, (expedition) => expedition.reception)
  expedition: Expedition;

  @OneToMany(() => Packages, (packages) => packages.reception)
  packages: Packages[];

// End Logistics
}
