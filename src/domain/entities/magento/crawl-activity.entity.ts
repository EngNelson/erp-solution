import { DbBaseEntity } from '@glosuite/shared';
import { CrawlResult, CrawlType } from 'src/domain/enums/magento';
import { Column, Entity } from 'typeorm';

@Entity('crawl-activity')
export class CrawlActivity extends DbBaseEntity {
  @Column({
    type: 'enum',
    enum: CrawlType,
  })
  action: CrawlType;

  @Column()
  entity: string;

  @Column({
    nullable: true,
  })
  pageSize?: number;

  @Column({
    nullable: true,
  })
  currentPage?: number;

  @Column({
    nullable: true,
  })
  totalCount?: number;

  @Column({
    type: 'enum',
    enum: CrawlResult,
  })
  result: CrawlResult;

  @Column({
    nullable: true,
  })
  error?: string;
}
