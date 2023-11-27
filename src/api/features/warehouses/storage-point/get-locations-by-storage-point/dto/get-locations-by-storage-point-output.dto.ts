import { LocationItemOutput } from 'src/domain/dto/warehouses';

export class GetLocationsByStoragePointOutput {
  constructor(items: LocationItemOutput[], totalItemsCount: number) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
  }

  items: LocationItemOutput[];
  totalItemsCount: number;
}
