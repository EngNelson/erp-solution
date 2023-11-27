import { Entity, Column, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { PackageStatus } from 'src/domain/enums/logistics';
import { DbBaseEntity } from '@glosuite/shared/dist/src/shared';
import { Expedition } from './expedition.entity';
import { StoragePoint } from '../warehouses/storage-point.entity';
import { Reception } from '../flows';
import { ProductItem } from '../items';
import { Order } from '../orders';


@Entity('packages')
export class Packages extends DbBaseEntity {
  @Column({
    unique: true,
  })
  reference: string;
  
  @Column()
  name: string;

  @Column({
    nullable: true,
  })
  description?: string;


  @Column({
    type: 'enum',
    enum: PackageStatus,
  })
  status: PackageStatus;
  
 @Column({
  nullable: true,
 })
 storagePointId?: string;

  @ManyToOne(() => StoragePoint, (storagePoint) => storagePoint.packages)
  @JoinColumn({ name: 'storagePointId' })
  storagePoint?: StoragePoint;

  @Column({
    nullable: true,
  })
  receptionId?: string;

  @ManyToOne(() => Reception, (reception) => reception.packages)
  @JoinColumn({name: 'receptionId'})
  reception: Reception;

  @OneToMany(() => ProductItem, (productitem) => productitem.packages)
  productItems: ProductItem[];
  

  @Column()
  expeditionId: Expedition;

  @ManyToOne(() => Expedition, (expedition) => expedition.packages)
  @JoinColumn({name: 'expeditionId'})
  expedition: Expedition;

  
}

 