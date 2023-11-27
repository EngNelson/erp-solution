import { DbBaseEntity } from '@glosuite/shared';
import { StepStatus } from 'src/domain/enums/flows';
import { ItemState } from 'src/domain/enums/items';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import {
  CustomerReturn,
  Investigation,
  MobileUnit,
  OtherOutput,
  Reception,
  StockMovement,
  SupplierReturn,
} from '../flows';
import { Order } from '../orders';
import { Supplier } from '../purchases';
import { Location } from '../warehouses';
import { ProductVariant } from './product-variant.entity';
import { Packages } from '../logistics';

@Entity('product-item')
export class ProductItem extends DbBaseEntity {
  @Column({ unique: false })
  reference: string;

  @Column({ unique: true })
  barcode: string;

  @Column({ nullable: true })
  returnProblem?: string;

  @Column({
    nullable: true,
  })
  purchaseCost?: number;

  @Column({
    nullable: true,
    unique: true,
  })
  imei?: string;

  @Column({
    nullable: true,
  })
  locationId?: string;

  @ManyToOne(() => Location, (location) => location.productItems)
  @JoinColumn({ name: 'locationId' })
  location?: Location;

  @Column({
    type: 'enum',
    enum: ItemState,
  })
  state: ItemState;

  @Column({
    type: 'enum',
    enum: StepStatus,
  })
  status: StepStatus;

  @Column({ nullable: true })
  supplierId?: string;

  @ManyToOne(() => Supplier, (supplier) => supplier.productItems)
  @JoinColumn({ name: 'supplierId' })
  supplier?: Supplier;

  @Column({
    type: 'boolean',
    default: false,
    nullable: true,
  })
  virtual?: boolean;

  @Column({
    type: 'boolean',
    default: false,
    nullable: true,
  })
  onDepositSale?: boolean;

  @OneToOne(() => Investigation, (invest) => invest.productItem)
  investigation?: Investigation;

  @Column()
  productVariantId: string;

  @ManyToOne(() => ProductVariant, (variant) => variant.productItems)
  @JoinColumn({ name: 'productVariantId' })
  productVariant: ProductVariant;

  @Column({ nullable: true })
  supplierReturnId?: string;

  @ManyToOne(() => SupplierReturn, (sr) => sr.productItems)
  @JoinColumn({ name: 'supplierReturnId' })
  supplierReturn?: SupplierReturn;

  @Column({ nullable: true })
  orderId?: string;

  @ManyToOne(() => Order, (order) => order.productItems)
  @JoinColumn({ name: 'orderId' })
  order?: Order;

  @Column({ nullable: true })
  customerReturnId?: string;

  @ManyToOne(() => CustomerReturn, (cr) => cr.productItems)
  @JoinColumn({ name: 'customerReturnId' })
  customerReturn?: CustomerReturn;

  @Column({ nullable: true })
  mobileUnitId?: string;

  @ManyToOne(() => MobileUnit, (mu) => mu.productItems)
  @JoinColumn({ name: 'mobileUnitId' })
  mobileUnit?: MobileUnit;

  @Column({ nullable: true })
  receptionId?: string;

  @ManyToOne(() => Reception, (reception) => reception.productItems)
  @JoinColumn({ name: 'receptionId' })
  reception?: Reception;

  @Column({
    nullable: true,
  })
  otherOutputId?: string;

  @ManyToOne(() => OtherOutput, (otherOutput) => otherOutput.productItems)
  @JoinColumn({ name: 'otherOutputId' })
  otherOutput?: OtherOutput;

  @OneToMany(() => StockMovement, (sm) => sm.productItem)
  stockMovements: StockMovement[];

  // Start Logistics
  @Column({
    nullable: true,
  })
  packagesId: string;

  @ManyToOne(() => Packages, (packages) => packages.productItems)
  @JoinColumn({ name: 'packagesId'})
  packages: Packages;

  // End Logistics
}
