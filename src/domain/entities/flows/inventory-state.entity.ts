import { DbBaseEntity } from '@glosuite/shared';
import { ProductQuantity } from 'src/domain/interfaces';
import { ProductItemInventoryState } from 'src/domain/interfaces/flows';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ProductVariant } from '../items';
import { Inventory } from './inventory.entity';

@Entity('inventory-state')
export class InventoryState extends DbBaseEntity {
  @Column({
    type: 'simple-json',
  })
  inStock: ProductQuantity;

  @Column({
    type: 'simple-json',
  })
  counted: ProductQuantity;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  itemsStates?: ProductItemInventoryState[];

  @Column()
  variantId: string;

  @ManyToOne(() => ProductVariant, (pv) => pv.inventoryStates)
  @JoinColumn({ name: 'variantId' })
  variant: ProductVariant;

  @Column()
  inventoryId: string;

  @ManyToOne(() => Inventory, (inventory) => inventory.inventoryStates)
  @JoinColumn({ name: 'inventoryId' })
  inventory: Inventory;
}
