import { DbBaseEntity } from '@glosuite/shared';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ProductVariant, Service } from '.';

@Entity('service-composition')
export class ServiceComposition extends DbBaseEntity {
  @Column()
  required: boolean;

  @Column()
  salePrice: number;

  @Column()
  variantId: string;

  @ManyToOne(() => ProductVariant, (variant) => variant.serviceCompositions)
  @JoinColumn({ name: 'variantId' })
  variant: ProductVariant;

  @Column()
  serviceId: string;

  @ManyToOne(() => Service, (service) => service.serviceCompositions)
  @JoinColumn({ name: 'serviceId' })
  service: Service;
}
