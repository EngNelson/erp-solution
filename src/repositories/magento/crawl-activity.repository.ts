import { CrawlActivity } from 'src/domain/entities/magento';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(CrawlActivity)
export class CrawlActivityRepository extends Repository<CrawlActivity> {}
