import { DbBaseEntity, UserCon } from '@glosuite/shared';
import { StepStatus } from 'src/domain/enums/flows';
import {
  DeliveryMode,
  OrderSource,
  OrderStep,
  OrderType,
  OrderVersion,
  ToBeCashed,
} from 'src/domain/enums/orders';
import { CommentModel, MiniUserPayload } from 'src/domain/interfaces';
import {
  BeforeDeliveryPaymentModel,
  CancelReasonItem,
  DeliveryFees,
  GuarantorPayload,
  OrderChangesToApplyModel,
} from 'src/domain/interfaces/orders';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Voucher } from '.';
import {
  CustomerReturn,
  OrderProcessing,
  Reception,
  StockMovement,
  Transfert,
} from '../flows';
import { ProductItem } from '../items';
import { PurchaseOrder } from '../purchases';
import { Address } from '../shared';
import { StoragePoint } from '../warehouses';
import { ArticleOrdered } from './article-ordered.entity';
import {
  PaymentMethod,
  PaymentMode,
  PaymentStatus,
} from 'src/domain/enums/finance';
import { AdvanceModel, Instalment } from 'src/domain/interfaces/finance';
import { Counter } from '../finance';
import { Delivery, Expedition, OrderExpedited, Packages } from '../logistics';

@Entity('order')
export class Order extends DbBaseEntity {
  @Column({
    nullable: true,
    unique: true,
  })
  magentoID?: number;

  @Column({ unique: true })
  reference: string;

  @Column({ unique: true })
  barcode: string;

  @Column({
    type: 'enum',
    enum: OrderVersion,
    default: OrderVersion.CURRENT,
  })
  version: OrderVersion;

  @Column({
    nullable: true,
  })
  sellerCode?: string;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  cancelReason?: CancelReasonItem;

  @Column({
    type: 'enum',
    enum: DeliveryMode,
  })
  deliveryMode: DeliveryMode;

  @Column({
    type: 'boolean',
    default: false,
  })
  prepaidIsRequired: boolean;

  @Column({
    type: 'enum',
    enum: PaymentMode,
    default: PaymentMode.AFTER_DELIVERY,
  })
  paymentMode: PaymentMode;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.UNPAID,
  })
  paymentStatus: PaymentStatus;

  @Column({
    type: 'enum',
    enum: ToBeCashed,
    default: ToBeCashed.NO,
  })
  toBeCashed?: ToBeCashed;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  beforeDeliveryPayment?: BeforeDeliveryPaymentModel;

  @Column({
    nullable: true,
  })
  preferedDeliveryDate?: Date;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  calculatedDeliveryFees?: DeliveryFees;

  @Column({
    nullable: true,
  })
  fixedDeliveryFees?: number;

  @Column({
    type: 'enum',
    enum: OrderSource,
  })
  orderSource: OrderSource;

  @Column({
    type: 'enum',
    enum: StepStatus,
  })
  orderStatus: StepStatus;

  @Column({
    type: 'enum',
    enum: OrderStep,
  })
  orderStep: OrderStep;

  @Column({
    type: 'enum',
    enum: OrderType,
    default: OrderType.DEFAULT_ORDER,
  })
  type: OrderType;

  @Column({
    type: 'double',
  })
  subTotal: number;

  @Column({ type: 'double' })
  total: number;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  instalment?: Instalment;

  @Column({ type: 'simple-json', nullable: true })
  guarantor?: GuarantorPayload;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  advance?: AdvanceModel;

  @Column({ nullable: true })
  outputById?: string; // user id

  @Column({ type: 'simple-json', nullable: true })
  outputBy?: MiniUserPayload;

  @Column({ nullable: true })
  assignToId?: string; // user id

  @Column({ type: 'simple-json', nullable: true })
  assignedTo?: MiniUserPayload;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @Column({
    nullable: true,
  })
  paymentRef?: string;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  comments?: CommentModel[];

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  changesToApply?: OrderChangesToApplyModel[];

  @Column({
    nullable: true,
  })
  sourceId?: string;

  @Column()
  billingAddressId: string;

  @ManyToOne(() => Address, (address) => address.billingOrders)
  @JoinColumn({ name: 'billingAddressId' })
  billingAddress: Address;

  @Column()
  deliveryAddressId: string;

  @ManyToOne(() => Address, (address) => address.deliveryOrders)
  @JoinColumn({ name: 'deliveryAddressId' })
  deliveryAddress: Address;

  @Column({
    nullable: true,
  })
  voucherId?: string;

  @ManyToOne(() => Voucher, (voucher) => voucher.orders)
  @JoinColumn({ name: 'voucherId' })
  voucher?: Voucher;

  @Column({
    nullable: true,
  })
  storagePointId?: string;

  @ManyToOne(() => StoragePoint, (storage) => storage.orders)
  @JoinColumn({ name: 'storagePointId' })
  storagePoint?: StoragePoint;

  @Column({
    nullable: true,
  })
  counterId?: string;

  @ManyToOne(() => Counter, (counter) => counter.orders)
  @JoinColumn({ name: 'counterId' })
  counter?: Counter;

  @OneToOne(() => Order, (order) => order.parent)
  child?: Order;

  @OneToOne(() => Order, (order) => order.child)
  @JoinColumn()
  parent?: Order;

  @OneToMany(() => CustomerReturn, (cr) => cr.order)
  customerReturns?: CustomerReturn[];

  @OneToMany(() => ProductItem, (item) => item.order)
  productItems: ProductItem[];

  @OneToMany(() => Transfert, (transfert) => transfert.order)
  transferts?: Transfert[];

  @OneToMany(() => ArticleOrdered, (ao) => ao.order)
  articleOrdereds: ArticleOrdered[];

  @OneToMany(() => OrderProcessing, (orderProcessing) => orderProcessing.order)
  orderProcessings?: OrderProcessing[];

  @OneToOne(() => PurchaseOrder, (purchaseOrder) => purchaseOrder.order)
  purchaseOrder?: PurchaseOrder;

  // @OneToOne(() => PickingList, (picking) => picking.order)
  // pickingList: PickingList;

  @OneToMany(() => StockMovement, (movement) => movement.order)
  stockMovements?: StockMovement[];

  @Column({ type: 'simple-json', nullable: true })
  assignedBy?: UserCon;

  @Column({ nullable: true })
  assignedAt?: Date;

  @Column({ type: 'simple-json', nullable: true })
  deliverValidatedBy?: UserCon;

  @Column({ nullable: true })
  deliveredAt?: Date;

  @Column({ nullable: true })
  pickedUpAt?: Date;

  @Column({ type: 'simple-json', nullable: true })
  preparedBy?: UserCon;

  @Column({ nullable: true })
  readyAt?: Date;

  @Column({ nullable: true })
  cashedAt?: Date;

  @Column({ type: 'simple-json', nullable: true })
  cashedBy?: UserCon;

  @Column({ type: 'simple-json', nullable: true })
  reportedBy?: UserCon;

  @Column({ nullable: true })
  reportedAt?: Date;

  @Column({ type: 'simple-json', nullable: true })
  refundedBy?: UserCon;

  @Column({ nullable: true })
  refundedAt?: Date;

  @Column({ type: 'simple-json', nullable: true })
  canceledBy?: UserCon;

  @Column({ nullable: true })
  canceledAt?: Date;

  // Start Logistics

  @OneToMany(() => Reception, (reception) => reception.order)
  receptions: Reception[];
  
  
  @OneToMany(() => OrderExpedited, (orderExpedited) => orderExpedited.order)
  ordersExpedited: OrderExpedited[];
  
  
  @Column({
    nullable: true,
  })
  deliveryId?: string;

  @ManyToOne(() => Delivery, (delivery) => delivery.orders)
  @JoinColumn({ name: 'deliveryId'})
  delivery: Delivery;

  // End Logistics
}


