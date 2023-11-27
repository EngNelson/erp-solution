import { DeliveryHub } from 'src/domain/enums/orders/e.delivery-hub';
import { ExtraMiniStoragePointOutput } from '../../warehouses';
import { SalesReportParameters } from 'src/domain/interfaces/analytics/ventes';
import { MiniUserPayload } from 'src/domain/interfaces';

export class GetSalesReportOuputParameters {
  constructor(salesReportParams: SalesReportParameters) {
    this.storagePoint = salesReportParams.storagePoint
      ? new ExtraMiniStoragePointOutput(salesReportParams.storagePoint)
      : null;
    this.agent = salesReportParams.agent ? salesReportParams.agent : null;
    this.hub = salesReportParams.hub ? salesReportParams.hub : null;
    this.startDate = salesReportParams.startDate
      ? salesReportParams.startDate
      : null;
    this.endDate = salesReportParams.endDate ? salesReportParams.endDate : null;
    this.specificDate = salesReportParams.specificDate
      ? salesReportParams.specificDate
      : null;
  }

  storagePoint?: ExtraMiniStoragePointOutput;
  agent?: MiniUserPayload;
  hub?: DeliveryHub;
  startDate?: Date;
  endDate?: Date;
  specificDate?: Date;
}
