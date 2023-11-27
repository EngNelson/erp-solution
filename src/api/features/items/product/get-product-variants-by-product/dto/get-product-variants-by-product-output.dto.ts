import { ProductVariantItemOutput } from 'src/domain/dto/items';

export class GetProductVariantsByProductOutput {
  constructor(
    items: ProductVariantItemOutput[],
    totalItemsCount: number,
    pageIndex: number,
    pageSize: number,
  ) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
  }

  items: ProductVariantItemOutput[];
  totalItemsCount: number;
  pageIndex: number;
  pageSize: number;
}
