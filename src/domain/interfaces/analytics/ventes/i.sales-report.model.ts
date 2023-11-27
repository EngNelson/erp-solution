import { SalesReportItem } from './i.sales-report-item';

export interface SalesReportModel {
  cashed: SalesReportItem[];
  delivered: SalesReportItem[];
  cancelled: SalesReportItem[];
  reported: SalesReportItem[];
}
