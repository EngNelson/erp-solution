import { CrawlResult } from 'src/domain/enums/magento';

export interface SyncHistoryModel {
  status: CrawlResult;
  error?: string;
  importedItems: number;
  minutes: number;
  createdAt: Date;
}
