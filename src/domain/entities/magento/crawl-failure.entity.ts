import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('crawl-failures')
export class CrawlFailure {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
  })
  entity: string;

  @Column({
    type: 'simple-json',
  })
  logs: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastUpdate: Date;
}
