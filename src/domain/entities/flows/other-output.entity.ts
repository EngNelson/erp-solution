import { DbBaseEntity, UserCon } from '@glosuite/shared';
import { OutputStatus, OutputType } from 'src/domain/enums/flows';
import { CommentModel, MiniUserPayload } from 'src/domain/interfaces';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { ProductItem } from '../items';
import { StoragePoint } from '../warehouses';
import { Reception } from './reception.entity';
import { StockMovement } from './stock-movement.entity';
import { VariantToOutput } from './variant-to-output.entity';

@Entity('other-output')
export class OtherOutput extends DbBaseEntity {
  @Column()
  reference: string;

  @Column({ unique: true })
  barcode: string;

  @Column({
    type: 'enum',
    enum: OutputType,
  })
  outputType: OutputType;

  @Column({
    type: 'enum',
    enum: OutputStatus,
  })
  status: OutputStatus;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  comments?: CommentModel[];

  @Column({
    nullable: true,
  })
  magentoOrderID?: string;

  @OneToOne(() => OtherOutput, (output) => output.parent)
  child?: OtherOutput;

  @OneToOne(() => OtherOutput, (output) => output.child)
  @JoinColumn()
  parent?: OtherOutput;

  @Column({ nullable: true })
  withdrawBy?: string; // user id

  @Column({ type: 'simple-json', nullable: true })
  withdrawedBy?: MiniUserPayload;

  @Column({ type: 'simple-json', nullable: true })
  confirmedBy?: UserCon;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  validatedBy?: UserCon;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  canceledBy?: UserCon;

  @Column({
    nullable: true,
  })
  cancelReason?: string;

  @Column({
    nullable: true,
  })
  storagePointId?: string;

  @ManyToOne(() => StoragePoint, (storage) => storage.otherOutputs)
  @JoinColumn({ name: 'storagePointId' })
  storagePoint?: StoragePoint;

  @OneToMany(
    () => VariantToOutput,
    (variantToOutput) => variantToOutput.otherOutput,
  )
  variantsToOutput: VariantToOutput[];

  @OneToMany(() => ProductItem, (item) => item.otherOutput)
  productItems?: ProductItem[];

  @OneToMany(() => StockMovement, (movement) => movement.otherOutput)
  stockMovements?: StockMovement[];

  @OneToOne(() => Reception, (reception) => reception.otherOutput)
  reception?: Reception;
}
