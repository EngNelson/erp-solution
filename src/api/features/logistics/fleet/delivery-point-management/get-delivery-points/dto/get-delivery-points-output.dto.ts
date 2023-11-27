import { GetDeliveriesOptionsDto } from 'src/domain/dto/delivery/get-deliveries-options.dto';


export class GetDeliveryPointsOutput {
  items: GetDeliveriesOptionsDto;
  totalItemsCount: number;
  pageIndex: number;
  pageSize: number;

  constructor(
    items: GetDeliveriesOptionsDto,
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
