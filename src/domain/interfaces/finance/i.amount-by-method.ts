import { PaymentMethod } from 'src/domain/enums/finance';

export interface AmountByMethod {
  paymentMethod: PaymentMethod;
  paymentRef?: string;
  amount: number;
}
