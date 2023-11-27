export enum OrderStep {
  TREATMENT_IN_PROGRESS = 'TREATMENT_IN_PROGRESS',
  AWAITING_RECEPTION = 'AWAITING_RECEPTION',
  TRANSFER_IN_PROGRESS = 'TRANSFER_IN_PROGRESS',
  PREPARATION_IN_PROGRESS = 'PREPARATION_IN_PROGRESS',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERY_TREATMENT = 'DELIVERY_TREATMENT',
  DELIVERY_IN_PROGRESS = 'DELIVERY_IN_PROGRESS',
  PENDING_WITHDRAWAL = 'PENDING_WITHDRAWAL',
  PAYMENT_IN_PROGRESS = 'PAYMENT_IN_PROGRESS',
  VERIFICATION_IN_PROGRESS = 'VERIFICATION_IN_PROGRESS',
  PURCHASE_IN_PROGRESS = 'PURCHASE_IN_PROGRESS',
  CASH_IN_HAND = 'CASH_IN_HAND',
  REFUNDED = 'REFUNDED',
  CANCELED = 'CANCELED',
}
