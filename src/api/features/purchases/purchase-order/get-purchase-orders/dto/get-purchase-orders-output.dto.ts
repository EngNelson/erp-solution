import { MiniPurchaseOrderOutput } from 'src/domain/dto/purchases';

export class GetPurchaseOrdersOutput {
  items: MiniPurchaseOrderOutput[];
  totalItemsCount: number;
  pageIndex: number;
  pageSize: number;

  constructor(
    items: MiniPurchaseOrderOutput[],
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
