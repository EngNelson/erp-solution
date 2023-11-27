import { MiniUserPayload } from '../i.mini-user-payload';

export interface BeforeDeliveryPaymentModel {
  savedAt: Date;
  savedBy: MiniUserPayload;
}
