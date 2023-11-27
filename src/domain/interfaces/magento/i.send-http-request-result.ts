import { MagentoArticleModel } from './i.magento-article.model';

export interface SendHttpRequestResult {
  magentoArticles: MagentoArticleModel[];
  pageSize: number;
  currentPage: number;
  lastUpdate: Date;
  currentCount: number;
  totalCount: number;
}
