import { UserCon } from '@glosuite/shared';
import {
  MovementType,
  StockMovementAreaType,
  TriggeredBy,
  TriggerType,
} from 'src/domain/enums/flows';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductItem } from '../items';
import { Order } from '../orders';
import { Location } from '../warehouses';
import { CustomerReturn } from './customer-return.entity';
import { Inventory } from './inventory.entity';
import { OtherOutput } from './other-output.entity';
import { Reception } from './reception.entity';
import { SupplierReturn } from './supplier-return.entity';
import { Transfert } from './transfert.entity';

@Entity('stock-movement')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: MovementType,
  })
  movementType: MovementType;

  @Column({
    type: 'enum',
    enum: TriggerType,
  })
  triggerType: TriggerType;

  @Column({
    type: 'enum',
    enum: TriggeredBy,
  })
  triggeredBy: TriggeredBy;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'simple-json', nullable: true })
  createdBy?: UserCon;

  @Column()
  productItemId: string;

  @ManyToOne(() => ProductItem, (item) => item.stockMovements)
  @JoinColumn({ name: 'productItemId' })
  productItem: ProductItem;

  // @OneToOne(() => StockMovement, (sm) => sm.previous)
  // next?: StockMovement;

  // @OneToOne(() => StockMovement, (sm) => sm.next)
  // @JoinColumn()
  // previous?: StockMovement;

  @Column({
    type: 'enum',
    enum: StockMovementAreaType,
    nullable: true,
  })
  sourceType?: StockMovementAreaType;

  @Column({
    type: 'enum',
    enum: StockMovementAreaType,
    nullable: true,
  })
  targetType?: StockMovementAreaType;

  @Column({
    nullable: true,
  })
  receptionId?: string;

  @ManyToOne(() => Reception, (r) => r.stockMovements)
  @JoinColumn({ name: 'receptionId' })
  reception?: Reception;

  @Column({ nullable: true })
  supplierReturnId?: string;

  @ManyToOne(() => SupplierReturn, (sr) => sr.stockMovements)
  @JoinColumn({ name: 'supplierReturnId' })
  supplierReturn?: SupplierReturn;

  @Column({ nullable: true })
  customerReturnId?: string;

  @ManyToOne(() => CustomerReturn, (cr) => cr.stockMovements)
  @JoinColumn({ name: 'customerReturnId' })
  customerReturn?: CustomerReturn;

  @Column({ nullable: true })
  sourceLocationId?: string;

  @ManyToOne(() => Location, (loc) => loc.stockMovementsFromSource)
  @JoinColumn({ name: 'sourceLocationId' })
  sourceLocation?: Location;

  @Column({ nullable: true })
  targetLocationId?: string;

  @ManyToOne(() => Location, (loc) => loc.stockMovementsFromTarget)
  @JoinColumn({ name: 'targetLocationId' })
  targetLocation?: Location;

  @Column({ nullable: true })
  inventoryId?: string;

  @ManyToOne(() => Inventory, (inventory) => inventory.stockMovements)
  @JoinColumn({ name: 'inventoryId' })
  inventory?: Inventory;

  // @Column({ nullable: true })
  // pickingListId?: string;

  // @ManyToOne(() => PickingList, (picking) => picking.stockMovements)
  // @JoinColumn({ name: 'pickingListId' })
  // pickingList?: PickingList;

  @Column({ nullable: true })
  transfertId?: string;

  @ManyToOne(() => Transfert, (transfert) => transfert.stockMovements)
  @JoinColumn({ name: 'transfertId' })
  transfert?: Transfert;

  @Column({ nullable: true })
  otherOutputId?: string;

  @ManyToOne(() => OtherOutput, (otherOutput) => otherOutput.stockMovements)
  @JoinColumn({ name: 'otherOutputId' })
  otherOutput?: OtherOutput;

  @Column({ nullable: true })
  orderId?: string;

  @ManyToOne(() => Order, (order) => order.stockMovements)
  @JoinColumn({ name: 'orderId' })
  order?: Order;
}
