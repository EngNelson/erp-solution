import { DbBaseEntity, TString } from '@glosuite/shared';
import { Column, Entity, OneToMany, TableInheritance } from 'typeorm';
import { ServiceComposition } from '.';

@Entity('service')
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export class Service extends DbBaseEntity {
  @Column({
    type: 'simple-json',
  })
  title: TString;

  @Column({
    type: 'boolean',
  })
  productRequired: boolean;

  @Column({
    type: 'boolean',
  })
  forAllProducts: boolean;

  @OneToMany(() => ServiceComposition, (sc) => sc.service)
  serviceCompositions: ServiceComposition[];
}
