import { DbBaseEntity } from '@glosuite/shared';
import { OperationLineState } from 'src/domain/enums/flows';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ProductVariant } from '../items';
import { Supplier } from '../purchases';
import { Reception } from './reception.entity';

@Entity('variant-reception')
export class VariantReception extends DbBaseEntity {
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
    nullable: true,
  })
  purchaseCost?: number;

  @Column({ nullable: true })
  supplierId?: string;

  @ManyToOne(() => Supplier, (supplier) => supplier.variantReceptions)
  @JoinColumn({ name: 'supplierId' })
  supplier?: Supplier;

  @Column()
  receptionId: string;

  @ManyToOne(() => Reception, (reception) => reception.variantReceptions)
  @JoinColumn({ name: 'receptionId' })
  reception: Reception;

  @Column()
  variantId: string;

  @ManyToOne(() => ProductVariant, (pv) => pv.variantReceptions)
  @JoinColumn({ name: 'variantId' })
  productVariant: ProductVariant;
}
