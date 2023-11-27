import { PaymentMethod } from 'src/domain/enums/finance';
import { SalesReportItem } from 'src/domain/interfaces/analytics/ventes';

export class SalesReportItemOutput {
  constructor(salesReportItem: SalesReportItem) {
    this.paymentMethod = salesReportItem.paymentMethod;
    this.total = salesReportItem.total;
    this.amount = salesReportItem.amount;
  }

  paymentMethod: PaymentMethod;
  total: number;
  amount: number;
}
