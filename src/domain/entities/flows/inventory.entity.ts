import { DbBaseEntity, TString, UserCon } from '@glosuite/shared';
import { OperationStatus } from 'src/domain/enums/flows';
import { CommentModel } from 'src/domain/interfaces';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Location } from '../warehouses';
import { InventoryState } from './inventory-state.entity';
import { Investigation } from './investigation.entity';
import { StockMovement } from './stock-movement.entity';

@Entity('inventory')
export class Inventory extends DbBaseEntity {
  @Column()
  reference: string;

  @Column({
    type: 'simple-json',
  })
  title: TString;

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
  comments?: CommentModel[];

  @Column({ type: 'simple-json', nullable: true })
  confirmedBy?: UserCon;

  @Column({ type: 'simple-json', nullable: true })
  validatedBy?: UserCon;

  @Column({ type: 'simple-json', nullable: true })
  canceledBy?: UserCon;

  @Column()
  locationId: string;

  @ManyToOne(() => Location, (loc) => loc.inventories)
  @JoinColumn({ name: 'locationId' })
  location: Location;

  @OneToMany(() => StockMovement, (sm) => sm.inventory)
  stockMovements?: StockMovement[];

  @OneToMany(() => InventoryState, (is) => is.inventory)
  inventoryStates: InventoryState[];

  @OneToMany(() => Investigation, (invest) => invest.inventory)
  investigations: Investigation[];
}
