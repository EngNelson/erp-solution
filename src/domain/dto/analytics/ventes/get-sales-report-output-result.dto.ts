import { SalesReportModel } from 'src/domain/interfaces/analytics/ventes';
import { SalesReportItemOutput } from './sales-report-item-output.dto';

export class GetSalesReportOutputResult {
  constructor(salesReport: SalesReportModel) {
    this.cashed = salesReport.cashed.map(
      (cashedItem) => new SalesReportItemOutput(cashedItem),
    );
    this.delivered = salesReport.delivered.map(
      (deliveredItem) => new SalesReportItemOutput(deliveredItem),
    );
    this.cancelled = salesReport.cancelled.map(
      (cancelledItem) => new SalesReportItemOutput(cancelledItem),
    );
    this.reported = salesReport.reported.map(
      (reportedItem) => new SalesReportItemOutput(reportedItem),
    );
  }

  cashed: SalesReportItemOutput[];
  delivered: SalesReportItemOutput[];
  cancelled: SalesReportItemOutput[];
  reported: SalesReportItemOutput[];
}
