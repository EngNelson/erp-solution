import { DbBaseEntity, UserCon } from '@glosuite/shared';
import { InvestigationStatus } from 'src/domain/enums/flows';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { ProductItem } from '../items';
import { Inventory } from './inventory.entity';
import { Reception } from './reception.entity';

@Entity('investigation')
export class Investigation extends DbBaseEntity {
  @Column()
  reference: string;

  @Column({
    type: 'enum',
    enum: InvestigationStatus,
    default: InvestigationStatus.PENDING,
  })
  status: InvestigationStatus;

  @Column({ nullable: true })
  comment?: string;

  @Column({ type: 'simple-json', nullable: true })
  closedBy?: UserCon;

  @Column()
  inventoryId: string;

  @ManyToOne(() => Inventory, (inventory) => inventory.investigations)
  @JoinColumn({ name: 'inventoryId' })
  inventory: Inventory;

  @OneToOne(() => ProductItem, (item) => item.investigation)
  @JoinColumn()
  productItem: ProductItem;

  @OneToOne(() => Reception, (reception) => reception.investigation)
  reception?: Reception;
}
