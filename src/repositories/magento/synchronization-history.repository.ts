import { SynchronizationHistory } from 'src/domain/entities/magento';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(SynchronizationHistory)
export class SynchronizationHistoryRepository extends Repository<SynchronizationHistory> {}
