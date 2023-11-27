import { ArticlesOrderedForReportOutput } from 'src/domain/dto/orders';

export class GetOrdersVariantsOutput {
  items: ArticlesOrderedForReportOutput[];
  totalItemsCount: number;

  constructor(
    items: ArticlesOrderedForReportOutput[],
    totalItemsCount: number,
  ) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
  }
}
