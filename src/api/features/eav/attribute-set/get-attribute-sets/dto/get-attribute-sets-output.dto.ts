import { MiniAttributeSetOutput } from 'src/domain/dto/items/eav';

export class GetAttributeSetsOutput {
  items: MiniAttributeSetOutput[];
  totalItemsCount: number;
  pageIndex: number;
  pageSize: number;

  constructor(
    items: MiniAttributeSetOutput[],
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
