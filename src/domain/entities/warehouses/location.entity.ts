import {
  CurrencyMap,
  DbBaseEntity,
  SpaceMap,
  TString,
  ValueMap,
} from '@glosuite/shared';
import { AreaType, LocationDefaultType } from 'src/domain/enums/warehouses';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Tree,
  TreeChildren,
  TreeParent,
} from 'typeorm';
import { Inventory, StockMovement } from '../flows';
import { ProductItem } from '../items';
import { Area } from './area.entity';

@Entity('location')
@Tree('materialized-path')
export class Location extends DbBaseEntity {
  @Column({ unique: true })
  reference: string;

  @Column({
    default: false,
  })
  archived: boolean;

  @Column({
    default: true,
  })
  activated: boolean;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  space?: SpaceMap;

  @Column()
  name: string;

  @Column({
    type: 'float',
    nullable: true,
  })
  surface?: number;

  @Column({
    type: 'float',
    nullable: true,
  })
  volume?: number;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  description?: TString;

  @Column({
    type: 'enum',
    enum: AreaType,
    default: AreaType.CUSTOM,
  })
  type: AreaType;

  @Column({
    type: 'enum',
    enum: LocationDefaultType,
    nullable: true,
  })
  defaultType?: LocationDefaultType;

  @Column({
    type: 'varchar',
    unique: true,
  })
  barCode: string;

  @Column({
    type: 'boolean',
    nullable: true,
    default: false,
  })
  supportedWeights?: boolean;

  @Column({
    default: false,
  })
  isProviderDedicated: boolean;

  @Column({
    default: false,
  })
  isVirtual: boolean;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  dedicatedSupplier?: ValueMap;

  @Column({
    type: 'integer',
    nullable: true,
    default: 0,
  })
  totalItems?: number;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  stockValue?: CurrencyMap[];

  @Column({
    nullable: true,
  })
  areaId?: string;

  @ManyToOne(() => Area, (a) => a.locations)
  @JoinColumn({ name: 'areaId' })
  area?: Area;

  @TreeParent()
  parentLocation: Location;

  @TreeChildren()
  children: Location[];

  @OneToMany(() => ProductItem, (item) => item.location)
  productItems: ProductItem[];

  @OneToMany(() => StockMovement, (sm) => sm.sourceLocation)
  stockMovementsFromSource: StockMovement[];

  @OneToMany(() => StockMovement, (sm) => sm.targetLocation)
  stockMovementsFromTarget: StockMovement[];

  @OneToMany(() => Inventory, (inventory) => inventory.location)
  inventories: Inventory[];
}
