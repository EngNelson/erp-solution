import {
  CompanyService,
  DbBaseEntity,
  Department,
  UserCon,
} from '@glosuite/shared';
import { InternalNeedUsage, InternalNeedStatus } from 'src/domain/enums/flows';
import { CommentModel, Employee } from 'src/domain/interfaces';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { PurchaseOrder } from '../purchases';
import { StoragePoint } from '../warehouses';
import { VariantNeeded } from './variant-needed.entity';

@Entity('internal-need')
export class InternalNeed extends DbBaseEntity {
  @Column()
  reference: string;

  @Column({
    type: 'enum',
    enum: InternalNeedUsage,
  })
  usage: InternalNeedUsage;

  @Column({ nullable: true })
  service?: CompanyService;

  @Column({ nullable: true })
  department?: Department;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  employee?: Employee;

  @Column({ type: 'simple-json' })
  addressTo: UserCon;

  @Column()
  reason: string;

  @Column({ nullable: true })
  response?: string;

  @Column({
    type: 'enum',
    enum: InternalNeedStatus,
  })
  status: InternalNeedStatus;

  @Column({ nullable: true })
  totalValue?: number;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  comments?: CommentModel[];

  @Column({ type: 'simple-json', nullable: true })
  validatedBy?: UserCon;

  @Column({ type: 'simple-json', nullable: true })
  canceledBy?: UserCon;

  @Column({ type: 'simple-json', nullable: true })
  rejectedBy?: UserCon;

  @Column({
    nullable: true,
  })
  rejectedAt?: Date;

  @Column({ nullable: true })
  storagePointId?: string;

  @ManyToOne(() => StoragePoint, (storage) => storage.internalNeeds)
  @JoinColumn({ name: 'storagePointId' })
  storagePoint?: StoragePoint;

  @OneToOne(() => PurchaseOrder, (po) => po.internalNeed)
  purchaseOrder?: PurchaseOrder;

  @OneToMany(() => VariantNeeded, (vn) => vn.internalNeed)
  variantNeededs: VariantNeeded[];

  // @OneToOne(() => PickingList, (picking) => picking.internalNeed)
  // pickingList: PickingList;
}
