import { DbBaseEntity, TString } from '@glosuite/shared';
import { ProductType } from 'src/domain/enums/items';
import { ProductQuantity } from 'src/domain/interfaces';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Category } from '../structures';
import { AttributeSet } from './eav';
import { ProductComposition } from './product-composition.entity';
import { ProductVariant } from './product-variant.entity';

@Entity('product')
export class Product extends DbBaseEntity {
  @Column({
    type: 'int',
    nullable: true,
  })
  minStock?: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  maxStock?: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  secureStock?: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  alertStock?: number;

  @Column({ unique: true })
  reference: string;

  @Column({ unique: true, nullable: true })
  sku: string;

  @Column({
    type: 'simple-json',
  })
  title: TString;

  // @Column({
  //   type: 'simple-json',
  //   nullable: true,
  // })
  // description?: TString;

  @Column({
    type: 'enum',
    enum: ProductType,
    default: ProductType.SIMPLE,
  })
  productType: ProductType;

  @Column({ nullable: true })
  attributeSetId?: string;

  @ManyToOne(() => AttributeSet, (attributeSet) => attributeSet.products)
  @JoinColumn({ name: 'attributeSetId' })
  attributeSet?: AttributeSet;

  @Column({
    type: 'boolean',
    default: true,
  })
  canBeSold: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  canBeRented: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  canBePackaged?: boolean;

  @Column({
    type: 'boolean',
    default: false,
    nullable: true,
  })
  mustBePackaged?: boolean;

  @Column({
    nullable: true,
    type: 'simple-json',
  })
  quantity: ProductQuantity;

  @ManyToMany(() => Category, (cat) => cat.products)
  @JoinTable()
  categories?: Category[];

  @OneToMany(
    () => ProductComposition,
    (productComposition) => productComposition.child,
  )
  parents?: ProductComposition[];

  @OneToMany(
    () => ProductComposition,
    (productComposition) => productComposition.parent,
  )
  children?: ProductComposition[];

  @OneToMany(() => ProductVariant, (variant) => variant.product)
  productVariants: ProductVariant[];
}
