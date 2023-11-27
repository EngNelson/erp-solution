import { ChildEntity, Column } from 'typeorm';
import { Service } from './service.entity';

@ChildEntity()
export class InstallationService extends Service {
  @Column({
    nullable: true,
  })
  specificity?: string;
}
