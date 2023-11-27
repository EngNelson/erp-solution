import { CrawlFailure } from 'src/domain/entities/magento';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(CrawlFailure)
export class CrawlFailureRepository extends Repository<CrawlFailure> {}
