import { DbBaseEntity } from '@glosuite/shared';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ProductVariant } from '../items';
import { OtherOutput } from './other-output.entity';

@Entity('variant-output')
export class VariantToOutput extends DbBaseEntity {
  @Column()
  position: number;

  @Column()
  quantity: number;

  @Column()
  productVariantId: string;

  @ManyToOne(() => ProductVariant, (pv) => pv.variantsToOutput)
  @JoinColumn({ name: 'productVariantId' })
  productVariant: ProductVariant;

  @Column()
  otherOutputId: string;

  @ManyToOne(() => OtherOutput, (otherOutput) => otherOutput.variantsToOutput)
  @JoinColumn({ name: 'otherOutputId' })
  otherOutput: OtherOutput;
}
