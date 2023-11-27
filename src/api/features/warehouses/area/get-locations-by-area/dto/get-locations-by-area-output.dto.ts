import { LocationItemOutput } from 'src/domain/dto/warehouses';

export class GetLocationsByAreaOutput {
  constructor(
    items: LocationItemOutput[],
    totalItemsCount: number,
    pageIndex: number,
    pageSize: number,
  ) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
  }

  items: LocationItemOutput[];
  totalItemsCount: number;
  pageIndex: number;
  pageSize: number;
}
