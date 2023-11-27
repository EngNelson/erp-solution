import { ChildEntity, Column } from 'typeorm';
import { Service } from './service.entity';

@ChildEntity()
export class WarrantyService extends Service {
  @Column({
    nullable: true,
  })
  durationInMonth?: number;
}
