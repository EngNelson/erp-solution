import { DbBaseEntity } from '@glosuite/shared';
import { OperationStatus, SupplierReturnType } from 'src/domain/enums/flows';
import { CommentModel } from 'src/domain/interfaces';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { ProductItem } from '../items';
import { Supplier } from '../purchases';
import { StockMovement } from './stock-movement.entity';

@Entity('supplier-return')
export class SupplierReturn extends DbBaseEntity {
  @Column()
  reference: string;

  @Column({
    type: 'enum',
    enum: SupplierReturnType,
  })
  type: SupplierReturnType;

  @Column({
    type: 'enum',
    enum: OperationStatus,
    default: OperationStatus.PENDING,
  })
  status: OperationStatus;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  commnets?: CommentModel[];

  @Column()
  supplierId: string;

  @ManyToOne(() => Supplier, (supplier) => supplier.supplierReturns)
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier;

  @OneToMany(() => StockMovement, (sm) => sm.supplierReturn)
  stockMovements: StockMovement[];

  @OneToMany(() => ProductItem, (item) => item.supplierReturn)
  productItems: ProductItem[];
}
