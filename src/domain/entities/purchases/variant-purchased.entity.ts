import { DbBaseEntity, UserCon } from '@glosuite/shared';
import { OperationLineState } from 'src/domain/enums/flows';
import { PurchaseStatusLine } from 'src/domain/enums/purchases';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ProductVariant } from '../items';
import { PurchaseOrder } from './purchase-order.entity';
import { Supplier } from './supplier.entity';

@Entity('variant-purchased')
export class VariantPurchased extends DbBaseEntity {
  @Column()
  position: number;

  @Column()
  quantity: number;

  @Column({
    type: 'enum',
    enum: OperationLineState,
    default: OperationLineState.PENDING,
  })
  state: OperationLineState;

  @Column({
    type: 'enum',
    enum: PurchaseStatusLine,
    nullable: true,
  })
  status?: PurchaseStatusLine;

  @Column({
    nullable: true,
  })
  comment?: string;

  @Column({
    nullable: true,
  })
  purchaseCost?: number;

  @Column({
    nullable: true,
  })
  realCost?: number;

  @Column({
    nullable: true,
  })
  customPrice?: number;

  @Column({ nullable: true })
  supplierId?: string;

  @ManyToOne(() => Supplier, (supplier) => supplier.variantPurchaseds)
  @JoinColumn({ name: 'supplierId' })
  supplier?: Supplier;

  @Column({ type: 'simple-json', nullable: true })
  canceledBy?: UserCon;

  @Column()
  variantId: string;

  @ManyToOne(() => ProductVariant, (pv) => pv.variantPurchaseds)
  @JoinColumn({ name: 'variantId' })
  variant: ProductVariant;

  @Column()
  purchaseOrderId: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.variantPurchaseds)
  @JoinColumn({ name: 'purchaseOrderId' })
  purchaseOrder: PurchaseOrder;
}
