import { DbBaseEntity } from '@glosuite/shared';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { SupplierReturn, VariantReception } from '../flows';
import { ProductItem } from '../items';
import { Address } from '../shared';
import { VariantPurchased } from './variant-purchased.entity';

@Entity('supplier')
export class Supplier extends DbBaseEntity {
  @Column({
    nullable: true,
  })
  magentoId?: number;

  @Column({
    unique: true,
  })
  name: string;

  @Column({ nullable: true })
  addressId?: string;

  @ManyToOne(() => Address, (address) => address.suppliers)
  @JoinColumn({ name: 'addressId' })
  address?: Address;

  @OneToMany(() => ProductItem, (productItem) => productItem.supplier)
  productItems: ProductItem[];

  @OneToMany(() => SupplierReturn, (sr) => sr.supplier)
  supplierReturns: SupplierReturn[];

  @OneToMany(() => VariantPurchased, (vp) => vp.supplier)
  variantPurchaseds?: VariantPurchased[];

  @OneToMany(() => VariantReception, (vr) => vr.supplier)
  variantReceptions?: VariantReception[];

  @Column({
    nullable: true,
    type: Date,
  })
  magentoCreatedAt?: Date;

  @Column({
    nullable: true,
    type: Date,
  })
  magentoUpdatedAt?: Date;
}
