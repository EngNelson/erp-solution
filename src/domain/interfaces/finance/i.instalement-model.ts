import { InstalmentStatus, PaymentMethod } from 'src/domain/enums/finance';
import { MiniUserCon } from '@glosuite/shared';

export interface InstalmentModel {
  position: number;
  status: InstalmentStatus;
  value: number;
  deadline: Date;
  paidAt?: Date;
  paidBy?: MiniUserCon;
  paymentMethod?: PaymentMethod;
  paymentRef?: string;
  cashedAt?: Date;
  cashedBy?: MiniUserCon;
}
