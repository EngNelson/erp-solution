export class GetPackagesOutput {
  items: any;
  totalItemsCount: number;
  pageIndex: number;
  pageSize: number;

  constructor(
    items: any,
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
