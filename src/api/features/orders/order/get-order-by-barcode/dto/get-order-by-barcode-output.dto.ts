import { Order } from 'src/domain/entities/orders';
import { PaymentMode } from 'src/domain/enums/finance';
import { StepStatus } from 'src/domain/enums/flows';
import { DeliveryMode, OrderStep } from 'src/domain/enums/orders';

export class GetOrderByBarcodeOutput {
  constructor(order: Order, totalItems: number) {
    this.id = order.id;
    this.reference = order.reference;
    this.barcode = order.barcode;
    this.status = order.orderStatus;
    this.step = order.orderStep;
    this.deliveryMode = order.deliveryMode;
    this.paymentMode = order.paymentMode;
    this.totalItems = totalItems;
    this.storagePointId = order.storagePointId;
  }

  id: string;
  reference: string;
  barcode: string;
  status: StepStatus;
  step: OrderStep;
  deliveryMode: DeliveryMode;
  paymentMode: PaymentMode;
  totalItems: number;
  storagePointId: string;
}
