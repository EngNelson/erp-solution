import { AdvancePaymentHistoryModel } from './i.advance-payments-history.model';

export interface AdvanceModel {
  firstPayment: number;
  balance: number;
  lastPayment?: Date;
  history: AdvancePaymentHistoryModel[];
}
