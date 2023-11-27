import { CrawlCache } from 'src/domain/entities/magento';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(CrawlCache)
export class CrawlCacheRepository extends Repository<CrawlCache> {}
