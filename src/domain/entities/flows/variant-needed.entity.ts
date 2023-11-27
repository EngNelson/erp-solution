import { DbBaseEntity } from '@glosuite/shared';
import { StatusLine } from 'src/domain/enums/flows';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ProductVariant } from '../items';
import { InternalNeed } from './internal-need.entity';

@Entity('variant-needed')
export class VariantNeeded extends DbBaseEntity {
  @Column()
  position: number;

  @Column()
  quantity: number;

  @Column({
    type: 'int',
    default: 0,
  })
  pickedQuantity: number;

  @Column()
  value: number;

  @Column({
    type: 'enum',
    enum: StatusLine,
  })
  status: StatusLine;

  @Column()
  internalNeedId: string;

  @ManyToOne(() => InternalNeed, (need) => need.variantNeededs)
  @JoinColumn({ name: 'internalNeedId' })
  internalNeed: InternalNeed;

  @Column()
  productVariantId: string;

  @ManyToOne(() => ProductVariant, (pv) => pv.variantNeededs)
  @JoinColumn({ name: 'productVariantId' })
  productVariant: ProductVariant;

  // @Column({ nullable: true })
  // pickingListId?: string;

  // @ManyToOne(() => PickingList, (picking) => picking.articleOrdereds)
  // @JoinColumn({ name: 'pickingListId' })
  // pickingList?: PickingList;
}
