import { Order } from 'src/domain/entities/orders';
import { PaymentMode, PaymentStatus } from 'src/domain/enums/finance';
import { StepStatus } from 'src/domain/enums/flows';
import { DeliveryMode, OrderSource, OrderStep } from 'src/domain/enums/orders';
import { ExtraMiniStoragePointOutput } from '../warehouses';
import { AdvanceModel, Instalment } from 'src/domain/interfaces/finance';
import { CommentModel } from 'src/domain/interfaces';
import { ExtraMiniAddressOutput } from '../shared';

export class MiniOrderOutput {
  constructor(order: Order) {
    this.id = order.id;
    this.reference = order.reference;
    this.status = order.orderStatus;
    // this.step = order.orderStep;
    this.barcode = order.barcode;
    // this.sellerCode = order.sellerCode;
    this.deliveryMode = order.deliveryMode;
    this.prepaidIsRequired = order.prepaidIsRequired;
    this.paymentMode = order.paymentMode;
    this.paymentStatus = order.paymentStatus;
    this.instalments = order.instalment ? order.instalment : null;
    this.advance = order.advance ? order.advance : null;
    // this.guarantor = order.guarantor ? order.guarantor : null;
    this.orderSource = order.orderSource;
    this.comments = order.comments ? order.comments : [];
    this.subTotal = order.subTotal;
    this.total = order.total;
    this.storagePoint = order.storagePoint
      ? new ExtraMiniStoragePointOutput(order.storagePoint)
      : null;
    this.createdAt = order.createdAt;
  }

  id: string;
  reference: string;
  status: StepStatus;
  // step: OrderStep;
  barcode: string;
  // sellerCode: string;
  deliveryMode: DeliveryMode;
  prepaidIsRequired: boolean;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  instalments?: Instalment;
  advance?: AdvanceModel;
  // guarantor?: GuarantorPayload;
  orderSource: OrderSource;
  comments?: CommentModel[];
  subTotal: number;
  total: number;
  storagePoint?: ExtraMiniStoragePointOutput;
  createdAt: Date;
}

export class MiniOrderListOutput {
  constructor(order: Order) {
    this.id = order.id;
    this.reference = order.reference;
    this.status = order.orderStatus;
    this.step = order.orderStep;
    this.barcode = order.barcode;
    this.sellerCode = order.sellerCode;
    this.deliveryMode = order.deliveryMode;
    this.deliveryAddress = new ExtraMiniAddressOutput(order.deliveryAddress);
    this.prepaidIsRequired = order.prepaidIsRequired;
    this.paymentMode = order.paymentMode;
    this.paymentStatus = order.paymentStatus;
    this.instalments = order.instalment ? order.instalment : null;
    this.advance = order.advance ? order.advance : null;
    // this.guarantor = order.guarantor ? order.guarantor : null;
    this.orderSource = order.orderSource;
    this.comments = order.comments ? order.comments : [];
    this.subTotal = order.subTotal;
    this.total = order.total;
    this.storagePoint = order.storagePoint
      ? new ExtraMiniStoragePointOutput(order.storagePoint)
      : null;
    this.createdAt = order.createdAt;
  }

  id: string;
  reference: string;
  status: StepStatus;
  step: OrderStep;
  barcode: string;
  sellerCode: string;
  deliveryMode: DeliveryMode;
  deliveryAddress: ExtraMiniAddressOutput;
  prepaidIsRequired: boolean;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  instalments?: Instalment;
  advance?: AdvanceModel;
  // guarantor?: GuarantorPayload;
  orderSource: OrderSource;
  comments?: CommentModel[];
  subTotal: number;
  total: number;
  storagePoint?: ExtraMiniStoragePointOutput;
  createdAt: Date;
}

export class ExtraMiniOrderOutput {
  constructor(order: Order) {
    this.id = order.id;
    this.reference = order.reference;
    this.status = order.orderStatus;
  }

  id: string;
  reference: string;
  status: StepStatus;
}
