import { DbBaseEntity, TString } from '@glosuite/shared';
import { MobileUnitStatus } from 'src/domain/enums/flows';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { ProductItem } from '../items';
import { Reception } from './reception.entity';
import { Transfert } from './transfert.entity';

@Entity('mobile-unit')
export class MobileUnit extends DbBaseEntity {
  @Column()
  reference: string;

  @Column()
  name: string;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  description?: TString;

  @Column({ nullable: true })
  password?: string;

  @Column({
    type: 'enum',
    enum: MobileUnitStatus,
    default: MobileUnitStatus.CLOSED,
  })
  status: MobileUnitStatus;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  barcodesScanned?: string[];

  @Column({ nullable: true })
  receptionId?: string;

  @ManyToOne(() => Reception, (r) => r.mobileUnits)
  @JoinColumn({ name: 'receptionId' })
  reception?: Reception;

  @Column()
  transfertId: string;

  @ManyToOne(() => Transfert, (transfert) => transfert.mobileUnits)
  @JoinColumn({ name: 'transfertId' })
  transfert: Transfert;

  @OneToMany(() => ProductItem, (item) => item.mobileUnit)
  productItems: ProductItem[];
}
