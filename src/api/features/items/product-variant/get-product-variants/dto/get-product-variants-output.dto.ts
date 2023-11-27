import { MiniProductVariantOutput } from 'src/domain/dto/items';

export class GetProductVariantsOutput {
  items: MiniProductVariantOutput[];
  totalItemsCount: number;
  pageIndex: number;
  pageSize: number;

  constructor(
    items: MiniProductVariantOutput[],
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
