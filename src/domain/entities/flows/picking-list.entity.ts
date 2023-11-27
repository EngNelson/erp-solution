import { DbBaseEntity, UserCon } from '@glosuite/shared';
import { OperationStatus, PickingPurpose } from 'src/domain/enums/flows';
import { Column, Entity } from 'typeorm';

@Entity('picking-list')
export class PickingList extends DbBaseEntity {
  @Column()
  reference: string;

  @Column({
    type: 'enum',
    enum: PickingPurpose,
  })
  purpose: PickingPurpose;

  @Column({
    type: 'enum',
    enum: OperationStatus,
    default: OperationStatus.PENDING,
  })
  status: OperationStatus.PENDING | OperationStatus.VALIDATED;

  @Column({ type: 'simple-json', nullable: true })
  validatedBy?: UserCon;

  // @OneToMany(() => StockMovement, (movement) => movement.pickingList)
  // stockMovements: StockMovement[];

  // @OneToOne(
  //   () => OrderProcessing,
  //   (orderProcessing) => orderProcessing.pickingList,
  // )
  // @JoinColumn()
  // orderProcessing?: OrderProcessing;

  // @OneToMany(() => VariantNeeded, (variantNeeded) => variantNeeded.pickingList)
  // variantNeededs?: VariantNeeded[];

  // @OneToOne(() => InternalNeed, (need) => need.pickingList)
  // @JoinColumn()
  // internalNeed?: InternalNeed;

  // @OneToMany(
  //   () => ArticleOrdered,
  //   (articleOrdered) => articleOrdered.pickingList,
  // )
  // articleOrdereds?: ArticleOrdered[];

  // @OneToOne(() => Order, (order) => order.pickingList)
  // @JoinColumn()
  // order?: Order;

  // @OneToMany(
  //   () => VariantTransfert,
  //   (variantTransfert) => variantTransfert.pickingList,
  // )
  // variantTransferts?: VariantTransfert[];

  // @OneToOne(() => Transfert, (transfert) => transfert.pickingList)
  // @JoinColumn()
  // transfert?: Transfert;
}
