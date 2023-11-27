import { DbBaseEntity, Image, MediaGallery, TString } from '@glosuite/shared';
import { ShippingClass } from 'src/domain/enums/orders';
import { StockAlert, ProductQuantity } from 'src/domain/interfaces';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import {
  InventoryState,
  VariantNeeded,
  VariantReception,
  VariantToOutput,
  VariantTransfert,
} from '../flows';
import { ArticleOrdered, Voucher } from '../orders';
import { VariantPurchased } from '../purchases';
import { Collection } from '../structures';
import { ExtraPackaging } from './extra-packaging.entity';
import { ProductItem } from './product-item.entity';
import { ProductVariantAttributeValues } from './product-variant-attribute-values.entity';
import { Product } from './product.entity';
import { ServiceComposition } from './service-composition.entity';
import { VariantComposition } from './variant-composition.entity';

@Entity('product-variant')
export class ProductVariant extends DbBaseEntity implements StockAlert {
  @Column({
    nullable: true,
  })
  magentoId?: number;

  @Column({
    nullable: true,
  })
  magentoSKU?: string;

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

  @Column({ unique: true })
  sku: string;

  @Column({
    type: 'simple-json',
  })
  title: TString;

  @Column({
    type: 'simple-json',
    width: 100000,
    nullable: true,
  })
  shortDescription?: TString;

  @Column({
    type: 'simple-json',
    width: 1000000,
    nullable: true,
  })
  description?: TString;

  @Column({
    type: 'enum',
    enum: ShippingClass,
    default: ShippingClass.MEDIUM,
  })
  shippingClass: ShippingClass;

  @Column({
    default: 0,
  })
  salePrice: number;

  @Column({
    nullable: true,
    default: 0,
  })
  purchaseCost?: number;

  @Column({
    nullable: true,
  })
  rentPrie?: number;

  @Column({ nullable: true })
  stockValue?: number;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  thumbnail?: Image;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  gallery?: MediaGallery[];

  @Column({
    nullable: true,
    type: 'simple-json',
  })
  quantity: ProductQuantity;

  @Column()
  productId: string;

  @ManyToOne(() => Product, (product) => product.productVariants)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ nullable: true })
  voucherId?: string;

  @ManyToOne(() => Voucher, (voucher) => voucher.productVariants)
  @JoinColumn({ name: 'voucherId' })
  specialPrice?: Voucher;

  @OneToMany(() => ProductItem, (item) => item.productVariant)
  productItems: ProductItem[];

  @OneToMany(() => ExtraPackaging, (ep) => ep.packaging)
  extraPackagings1: ExtraPackaging[];

  @OneToMany(() => ExtraPackaging, (ep) => ep.variant)
  extraPackagings2: ExtraPackaging[];

  @OneToMany(
    () => ProductVariantAttributeValues,
    (attrValue) => attrValue.productVariant,
  )
  attributeValues: ProductVariantAttributeValues<any>[];

  @OneToMany(() => ServiceComposition, (sc) => sc.variant)
  serviceCompositions: ServiceComposition[];

  @OneToMany(() => VariantReception, (vr) => vr.productVariant)
  variantReceptions: VariantReception[];

  @OneToMany(() => VariantPurchased, (vp) => vp.variant)
  variantPurchaseds: VariantPurchased[];

  @OneToMany(() => InventoryState, (is) => is.variant)
  inventoryStates: InventoryState[];

  @OneToMany(() => VariantTransfert, (vt) => vt.variant)
  variantTransferts: VariantTransfert[];

  @OneToMany(() => ArticleOrdered, (ao) => ao.productVariant)
  articleOrdereds: ProductVariant[];

  @OneToMany(() => VariantNeeded, (vn) => vn.productVariant)
  variantNeededs: VariantNeeded[];

  @OneToMany(
    () => VariantToOutput,
    (variantToOutput) => variantToOutput.productVariant,
  )
  variantsToOutput: VariantToOutput[];

  @ManyToMany(() => Collection, (collection) => collection.productVariants)
  collections: Collection[];

  @OneToMany(
    () => VariantComposition,
    (variantComposition) => variantComposition.child,
  )
  parents?: VariantComposition[];

  @OneToMany(
    () => VariantComposition,
    (variantComposition) => variantComposition.parent,
  )
  children?: VariantComposition[];

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
