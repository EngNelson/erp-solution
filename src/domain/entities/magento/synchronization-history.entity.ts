import { CrawlResult } from 'src/domain/enums/magento';
import { SyncHistoryModel } from 'src/domain/interfaces/magento';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('synchronization-history')
export class SynchronizationHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
  })
  entity: string;

  @Column({
    type: 'enum',
    enum: CrawlResult,
  })
  lastStatus: CrawlResult;

  @Column()
  times: number;

  @Column({
    type: 'simple-json',
  })
  history: SyncHistoryModel;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastUpdate: Date;
}
