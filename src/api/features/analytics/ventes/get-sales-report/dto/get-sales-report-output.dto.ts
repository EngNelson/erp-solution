import {
  GetSalesReportOuputParameters,
  GetSalesReportOutputResult,
} from 'src/domain/dto/analytics/ventes';
import { SalesReportParameters } from 'src/domain/interfaces/analytics/ventes';

export class GetSalesReportOutput {
  constructor(
    salesReportParams: SalesReportParameters,
    salesReportResult: GetSalesReportOutputResult,
  ) {
    this.params = new GetSalesReportOuputParameters(salesReportParams);
    this.report = salesReportResult;
  }

  params: GetSalesReportOuputParameters;
  report: GetSalesReportOutputResult;
}
