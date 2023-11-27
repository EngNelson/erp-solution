import { PaymentMethod } from 'src/domain/enums/finance';

export interface SalesReportItem {
  paymentMethod: PaymentMethod;
  total: number;
  amount: number;
}
