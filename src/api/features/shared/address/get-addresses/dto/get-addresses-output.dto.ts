import { MiniAddressOutput } from 'src/domain/dto/shared';

export class GetAddressesOutput {
  constructor(
    items: MiniAddressOutput[],
    totalItemsCount: number,
    pageIndex?: number,
    pageSize?: number,
  ) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
    this.pageIndex = pageIndex ? pageIndex : null;
    this.pageSize = pageSize ? pageSize : null;
  }

  items: MiniAddressOutput[];
  totalItemsCount: number;
  pageIndex?: number;
  pageSize?: number;
}
