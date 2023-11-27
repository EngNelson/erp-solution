import { DbBaseEntity } from '@glosuite/shared';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ProductVariant } from '.';

@Entity('extra-packaging')
export class ExtraPackaging extends DbBaseEntity {
  @Column({
    type: 'int',
  })
  capacity: number;

  @Column()
  packagingId: string;

  @ManyToOne(() => ProductVariant, (pv) => pv.extraPackagings1)
  @JoinColumn({ name: 'packageId' })
  packaging: ProductVariant;

  @Column()
  variantId: string;

  @ManyToOne(() => ProductVariant, (pv) => pv.extraPackagings2)
  @JoinColumn({ name: 'variantId' })
  variant: ProductVariant;
}
