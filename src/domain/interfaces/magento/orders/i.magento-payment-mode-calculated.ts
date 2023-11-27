import { PaymentMode } from 'src/domain/enums/finance';
import { CalculatedPaymentModeData } from './i.calculated-payment-mode-data';

export interface MagentoPaymentModeCalculated {
  mode: PaymentMode;
  data: CalculatedPaymentModeData;
}
