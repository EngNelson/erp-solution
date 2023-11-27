import { MiniReceptionWithOrderOutput } from 'src/domain/dto/flows';

export class GetReceptionsOutput {
  items: MiniReceptionWithOrderOutput[];
  totalItemsCount: number;
  pageIndex: number;
  pageSize: number;

  constructor(
    items: MiniReceptionWithOrderOutput[],
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
