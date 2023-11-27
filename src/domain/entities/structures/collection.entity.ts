import {
  CollectionType,
  DbBaseEntity,
  Status,
  TString,
} from '@glosuite/shared';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  Tree,
  TreeChildren,
  TreeParent,
} from 'typeorm';
import { ProductVariant } from '../items';
import { Voucher } from '../orders';
import { Category } from './category.entity';

@Entity('collection')
@Tree('materialized-path')
export class Collection extends DbBaseEntity {
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
    type: 'enum',
    enum: CollectionType,
    default: CollectionType.DEFAULT,
  })
  collectionType: CollectionType;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  startDate?: Date;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  endDate?: Date;

  @TreeParent()
  parentCollection?: Collection;

  @Column({ nullable: true })
  voucherId?: string;

  @ManyToMany(() => Voucher, (voucher) => voucher.collections)
  @JoinColumn({ name: 'voucherId' })
  discount?: Voucher;

  @TreeChildren()
  subCollections?: Collection[];

  @ManyToMany(() => Category, (cat) => cat.collections)
  @JoinTable()
  categories: Category[];

  @ManyToMany(() => ProductVariant, (variant) => variant.collections)
  @JoinTable()
  productVariants: ProductVariant[];

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
