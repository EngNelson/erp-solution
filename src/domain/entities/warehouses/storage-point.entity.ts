import {
  DbBaseEntity,
  SpaceMap,
  StoragePointStatus,
  StoragePointType,
  TString,
} from '@glosuite/shared';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import {
  CustomerReturn,
  InternalNeed,
  OtherOutput,
  Reception,
  Transfert,
} from '../flows';
import { Order } from '../orders';
import { PurchaseOrder } from '../purchases';
import { Address } from '../shared';
import { Area } from './area.entity';
import { Counter } from '../finance';
import { Expedition, Packages } from '../logistics';

@Entity('storage-point')
export class StoragePoint extends DbBaseEntity {
  @Column({ unique: true })
  reference: string;

  @Column({
    type: 'enum',
    enum: StoragePointType,
    default: StoragePointType.WAREHOUSE,
  })
  storageType: StoragePointType;

  @Column({
    type: 'int',
    default: 0,
  })
  isPrimary: number;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  space?: SpaceMap;

  @Column({
    type: 'float',
    nullable: true,
  })
  surface?: number;

  @Column({
    type: 'float',
    nullable: true,
  })
  volume?: number;

  @Column({ unique: true })
  name: string;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  description?: TString;

  // @Column({
  //   default:
  //     'Nous livrons chez vous - Livraison à Domicille. We deliver to your doorstep - Home delivery',
  // })
  // locationKeywords: string;

  @Column({
    nullable: true,
  })
  priority?: number;

  @Column({
    type: Boolean,
    default: false,
  })
  allowSales: boolean;

  @Column({
    type: Boolean,
    default: false,
  })
  allowVirtualZones: boolean;

  @Column({
    type: 'enum',
    enum: StoragePointStatus,
    default: StoragePointStatus.OPEN,
  })
  status: StoragePointStatus;

  @Column()
  addressId: string;

  @ManyToOne(() => Address, (a) => a.storagePoints)
  @JoinColumn({ name: 'addressId' })
  address: Address;

  @OneToMany(() => Area, (a) => a.storagePoint)
  areas: Area[];

  @OneToMany(() => Transfert, (transfert) => transfert.source)
  incomingTransferts: Transfert[];

  @OneToMany(() => Transfert, (transfert) => transfert.target)
  outgoingTransferts: Transfert[];

  @OneToMany(() => InternalNeed, (need) => need.storagePoint)
  internalNeeds: InternalNeed[];

  @OneToMany(() => Reception, (reception) => reception.storagePoint)
  receptions: Reception[];

  @OneToMany(() => PurchaseOrder, (purchaseOrder) => purchaseOrder.storagePoint)
  purchaseOrders: PurchaseOrder[];

  @OneToMany(() => CustomerReturn, (cr) => cr.storagePoint)
  customerReturns?: CustomerReturn[];

  @OneToMany(() => Order, (order) => order.storagePoint)
  orders?: Order[];

  @OneToMany(() => OtherOutput, (otherOutput) => otherOutput.storagePoint)
  otherOutputs?: OtherOutput[];

  @OneToMany(() => Counter, (counter) => counter.storagePoint)
  counters?: Counter[];

// Start Logistics
  @OneToMany(() => Expedition, (expedition) => expedition.storagePoint)
  expeditions: Expedition[];

  @OneToMany(() => Packages, (Packages) => Packages.storagePoint)
  packages: Packages[];

  // End Logistics
}
