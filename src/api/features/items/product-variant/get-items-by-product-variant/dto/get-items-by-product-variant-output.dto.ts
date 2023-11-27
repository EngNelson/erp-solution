import { ProductItemItemOutput } from 'src/domain/dto/items';

export class GetItemsByProductVariantOutput {
  constructor(
    items: ProductItemItemOutput[],
    totalItemsCount: number,
    pageIndex: number,
    pageSize: number,
  ) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
  }

  items: ProductItemItemOutput[];
  totalItemsCount: number;
  pageIndex: number;
  pageSize: number;
}
