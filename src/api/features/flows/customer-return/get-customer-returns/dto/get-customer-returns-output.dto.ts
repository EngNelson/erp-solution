import { MiniCustomerReturnOutput } from 'src/domain/dto/flows';

export class GetCustomerReturnsOutput {
  items: MiniCustomerReturnOutput[];
  totalItemsCount: number;
  pageIndex: number;
  pageSize: number;

  constructor(
    items: MiniCustomerReturnOutput[],
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
