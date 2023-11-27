import { DbBaseEntity } from '@glosuite/shared';
import { OperationLineState, StatusLine } from 'src/domain/enums/flows';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ProductVariant } from '../items';
import { Transfert } from './transfert.entity';

@Entity('variant-transfert')
export class VariantTransfert extends DbBaseEntity {
  @Column()
  position: number;

  @Column()
  quantity: number;

  @Column({
    type: 'int',
    default: 0,
  })
  pickedQuantity: number;

  @Column({
    type: 'enum',
    enum: StatusLine,
  })
  status: StatusLine;

  @Column({
    type: 'enum',
    enum: OperationLineState,
    default: OperationLineState.PENDING,
  })
  state: OperationLineState;

  @Column()
  transfertId: string;

  @ManyToOne(() => Transfert, (transfert) => transfert.variantTransferts)
  @JoinColumn({ name: 'transfertId' })
  transfert: Transfert;

  @Column()
  variantId: string;

  @ManyToOne(() => ProductVariant, (pv) => pv.variantTransferts)
  @JoinColumn({ name: 'variantId' })
  variant: ProductVariant;

  // @Column({ nullable: true })
  // pickingListId?: string;

  // @ManyToOne(() => PickingList, (picking) => picking.variantTransferts)
  // @JoinColumn({ name: 'pickingListId' })
  // pickingList?: PickingList;
}
