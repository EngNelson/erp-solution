import { PaymentAdditionalInfo } from './i.payment-additional-info';

export interface MagentoPayementModel {
  additional_information: string[];
  method: string;
  shipping_amount: number;
  payment_additional_info: PaymentAdditionalInfo[];
  last_trans_id?: string;
}
