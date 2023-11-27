import {
  AddressUsage,
  DbBaseEntity,
  PositionMap,
  ValueMap,
} from '@glosuite/shared';
import { Column, Entity, OneToMany } from 'typeorm';
import { Order } from '../orders';
import { Supplier } from '../purchases';
import { StoragePoint } from '../warehouses';

@Entity('address')
export class Address extends DbBaseEntity {
  @Column({
    type: 'enum',
    enum: AddressUsage,
    default: AddressUsage.WAREHOUSES_USAGE,
  })
  usage: AddressUsage;

  @Column({
    nullable: true,
  })
  fullName?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({
    nullable: true,
  })
  email?: string;

  @Column({ nullable: true })
  postalCode?: number;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  positionRef?: PositionMap;

  @Column({
    type: 'simple-json',
    transformer: {
      from: (value: string) => (value ? JSON.parse(value) : []),
      to: (value: PositionMap[]) => JSON.stringify(value || []),
    },
    nullable: true,
  })
  positions?: PositionMap[];

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  street?: ValueMap;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  quarter?: ValueMap;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  city?: ValueMap;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  region?: ValueMap;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  country?: ValueMap;

  @OneToMany(() => StoragePoint, (sp) => sp.address)
  storagePoints: StoragePoint[];

  @OneToMany(() => Supplier, (supplier) => supplier.address)
  suppliers: Supplier[];

  @OneToMany(() => Order, (order) => order.billingAddress)
  billingOrders: Order[];

  @OneToMany(() => Order, (order) => order.deliveryAddress)
  deliveryOrders: Order[];
}
