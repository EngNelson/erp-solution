import { DbBaseEntity, SpaceMap, TString } from '@glosuite/shared';
import { AreaDefaultType, AreaType } from 'src/domain/enums/warehouses';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Location } from './location.entity';
import { StoragePoint } from './storage-point.entity';

@Entity('area')
export class Area extends DbBaseEntity {
  @Column({ unique: true })
  reference: string;

  @Column()
  title: string;

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
    enum: AreaDefaultType,
    nullable: true,
  })
  defaultType?: AreaDefaultType;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  space?: SpaceMap;

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
    type: Boolean,
    default: false,
  })
  isVirtual: boolean;

  @Column()
  storagePointId: string;

  /**
   * Represent the `StoragePoint` Object that owns this area.
   *
   * @NavigationProperty
   */
  @ManyToOne(() => StoragePoint, (sp) => sp.areas)
  @JoinColumn({ name: 'storagePointId' })
  storagePoint: StoragePoint;

  /**
   * Reprents the all the `Location` objects that composes the area.
   *
   * @NavigationProperty
   */
  @OneToMany(() => Location, (l) => l.area)
  locations: Location[];
}
