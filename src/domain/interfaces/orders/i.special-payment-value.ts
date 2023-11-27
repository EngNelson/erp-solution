import { SpecialPaymentType } from 'src/domain/enums/orders';

export interface SpecialPaymentValue {
  type: SpecialPaymentType;
  amount: number;
}
