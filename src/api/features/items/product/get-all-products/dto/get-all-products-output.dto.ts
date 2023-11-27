import { ProductItemWithAverageCostOutput } from 'src/domain/dto/items';

export class GetAllProductsOutput {
  items: ProductItemWithAverageCostOutput[];
  totalItemsCount: number;
  pageIndex: number;
  pageSize: number;

  constructor(
    items: ProductItemWithAverageCostOutput[],
    totalItemsCount: number,
    pageIndex: number,
    pageSize: number,
  ) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
  }
}
