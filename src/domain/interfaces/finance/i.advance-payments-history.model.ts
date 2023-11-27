import { MiniUserCon } from '@glosuite/shared';
import { AdvanceHistoryStatus, PaymentMethod } from 'src/domain/enums/finance';

export interface AdvancePaymentHistoryModel {
  amount: number;
  paidAt: Date;
  status: AdvanceHistoryStatus;
  paidBy?: MiniUserCon;
  paymentMethod?: PaymentMethod;
  paymentRef?: string;
  cashedAt?: Date;
  cashedBy?: MiniUserCon;
}
