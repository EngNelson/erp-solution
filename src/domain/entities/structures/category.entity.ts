import { DbBaseEntity, Status, TString } from '@glosuite/shared';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  Tree,
  TreeChildren,
  TreeParent,
} from 'typeorm';
import { Product } from '../items';
import { AttributeSet } from '../items/eav';
import { Voucher } from '../orders';
import { Collection } from './collection.entity';

@Entity('category')
@Tree('materialized-path')
export class Category extends DbBaseEntity {
  @Column({
    nullable: true,
  })
  magentoId?: number;

  @Column({
    type: 'simple-json',
  })
  title: TString;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  description?: TString;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.ENABLED,
  })
  status: Status;

  @Column({
    type: 'boolean',
    default: false,
  })
  isFmcg: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  addInStatistics: boolean;

  @Column({
    type: 'varchar',
    length: 20,
  })
  symbol: string;

  @TreeParent()
  parentCategory?: Category;

  @TreeChildren()
  subCategories?: Category[];

  @Column({ nullable: true })
  attributeSetId?: string;

  @ManyToOne(() => AttributeSet, (attrSet) => attrSet.categories)
  @JoinColumn({ name: 'attributeSetId' })
  attributeSet: AttributeSet;

  @Column({ nullable: true })
  voucherId?: string;

  @ManyToOne(() => Voucher, (voucher) => voucher.categories)
  @JoinColumn({ name: 'voucherId' })
  discount?: Voucher;

  @ManyToMany(() => Collection, (col) => col.categories)
  collections?: Collection[];

  @ManyToMany(() => Product, (product) => product.categories)
  products: Product[];

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
