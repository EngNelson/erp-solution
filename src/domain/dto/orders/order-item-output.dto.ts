import { ISOLang } from '@glosuite/shared';
import { StepStatus } from 'src/domain/enums/flows';
import {
  DeliveryMode,
  OrderSource,
  OrderStep,
  OrderType,
  OrderVersion,
} from 'src/domain/enums/orders';
import {
  CancelReasonItem,
  DeliveryFees,
  GuarantorPayload,
  MiniChangesToApplyOutputModel,
} from 'src/domain/interfaces/orders';
import { OrderModel } from 'src/domain/types/orders';
import { VoucherItemOutput } from '.';
import {
  ExtraMiniStockMovementOutput,
  ExtraMiniTransfertOutput,
  ExtraMiniTransfertOutputForGetOrderById,
  MiniCustomerReturnOutput,
  MiniOrderProcessingItemOutput,
  MiniStockMovementOutput,
  OrderProcessingItemOutput,
} from '../flows';
import {
  ExtraMiniProductItemOutput,
  ProductItemInMobileUnitItemOutput,
  ProductItemItemOutput,
} from '../items';
import { MiniPurchaseOrderOutput } from '../purchases';
import { MiniAddressOutput } from '../shared';
import { ExtraMiniStoragePointOutput } from '../warehouses';
import { ArticlesOrderedOutput } from './articles-ordered-output.dto';
import { ExtraMiniOrderOutput, MiniOrderOutput } from './mini-order-output.dto';
import {
  PaymentMethod,
  PaymentMode,
  PaymentStatus,
} from 'src/domain/enums/finance';
import { CommentModel, MiniUserPayload } from 'src/domain/interfaces';
import { AdvanceModel, Instalment } from 'src/domain/interfaces/finance';
import { MiniUserOutput } from '../auth';
import { ExtraMiniPurchaseOrderOutput } from '../purchases/extra-mini-purchase-order-output.dto';

export class OrderItemOutput {
  constructor(orderModel: OrderModel, lang: ISOLang) {
    this.id = orderModel.order.id;
    this.reference = orderModel.order.reference;
    this.magentoId = orderModel.order.magentoID;
    this.barcode = orderModel.order.barcode;
    this.version = orderModel.order.version;
    this.deliveryMode = orderModel.order.deliveryMode;
    this.paymentMethod = orderModel.order.paymentMethod;
    this.paymentRef = orderModel.order.paymentRef
      ? orderModel.order.paymentRef
      : null;
    this.prepaidIsRequired = orderModel.order.prepaidIsRequired;
    this.paymentMode = orderModel.order.paymentMode;
    this.paymentStatus = orderModel.order.paymentStatus;
    this.instalments = orderModel.order.instalment
      ? orderModel.order.instalment
      : null;
    this.advance = orderModel.order.advance ? orderModel.order.advance : null;
    this.guarantor = orderModel.order.guarantor
      ? orderModel.order.guarantor
      : null;
    this.outputBy = orderModel.order.outputBy
      ? orderModel.order.outputBy
      : null;
    this.sellerCode = orderModel.order.sellerCode;
    this.preferredDeliveryDate = orderModel.order.preferedDeliveryDate
      ? orderModel.order.preferedDeliveryDate
      : null;
    this.calculatedDeliveryFees = orderModel.order.calculatedDeliveryFees
      ? orderModel.order.calculatedDeliveryFees
      : null;
    this.fixedDeliveryFees = orderModel.order.fixedDeliveryFees;
    this.storagePoint = new ExtraMiniStoragePointOutput(
      orderModel.order.storagePoint,
    );
    this.articlesOrdered = orderModel.articlesOrdered.map(
      (articleOrdered) => new ArticlesOrderedOutput(articleOrdered, lang),
    );
    this.voucher = orderModel.order.voucher
      ? new VoucherItemOutput(orderModel.order.voucher)
      : null;
    this.subTotal = orderModel.order.subTotal;
    this.total = orderModel.order.total;
    this.orderStatus = orderModel.order.orderStatus;
    this.orderStep = orderModel.order.orderStep;
    this.type = orderModel.order.type;
    this.orderSource = orderModel.order.orderSource;
    this.billingAddress = new MiniAddressOutput(
      orderModel.order.billingAddress,
    );
    this.deliveryAddress = new MiniAddressOutput(
      orderModel.order.deliveryAddress,
    );
    this.child = orderModel.order.child
      ? new ExtraMiniOrderOutput(orderModel.order.child)
      : null;
    this.parent = orderModel.order.parent
      ? new ExtraMiniOrderOutput(orderModel.order.parent)
      : null;
    this.customerReturns = orderModel.order.customerReturns
      ? orderModel.order.customerReturns.map(
          (customerReturn) => new MiniCustomerReturnOutput(customerReturn),
        )
      : [];
    this.productItems = orderModel.order.productItems
      ? orderModel.order.productItems.map(
          (productItem) => new ProductItemItemOutput(productItem, lang),
        )
      : [];
    this.transferts = orderModel.order.transferts
      ? orderModel.order.transferts.map(
          (transfert) => new ExtraMiniTransfertOutput(transfert),
        )
      : [];
    this.orderProcessings = orderModel.order.orderProcessings
      ? orderModel.order.orderProcessings.map(
          (orderProcessing) => new OrderProcessingItemOutput(orderProcessing),
        )
      : [];
    this.purchaseOrder = orderModel.order.purchaseOrder
      ? new MiniPurchaseOrderOutput(orderModel.order.purchaseOrder, lang)
      : null;
    this.stockMovements = orderModel.order.stockMovements
      ? orderModel.order.stockMovements.map(
          (stockMovement) => new MiniStockMovementOutput(stockMovement, lang),
        )
      : [];
    this.cancelReason = orderModel.order.cancelReason
      ? orderModel.order.cancelReason
      : null;
    this.comments = orderModel.order.comments ? orderModel.order.comments : [];
    this.chnagesToApply =
      orderModel.changesToApply && orderModel.changesToApply.length > 0
        ? orderModel.changesToApply
        : [];
    this.sourceVersion = orderModel.order.sourceId
      ? new MiniOrderOutput(orderModel.sourceVersion)
      : null;
    this.assignedBy = orderModel.order.assignedBy
      ? new MiniUserOutput(orderModel.order.assignedBy)
      : null;
    this.assignedTo = orderModel.order.assignedTo
      ? orderModel.order.assignedTo
      : null;
    this.assignedAt = orderModel.order.assignedAt
      ? orderModel.order.assignedAt
      : null;
    this.deliverValidatedBy = orderModel.order.deliverValidatedBy
      ? new MiniUserOutput(orderModel.order.deliverValidatedBy)
      : null;
    this.deliveredAt = orderModel.order.deliveredAt
      ? orderModel.order.deliveredAt
      : null;
    this.pickedUpAt = orderModel.order.pickedUpAt
      ? orderModel.order.pickedUpAt
      : null;
    this.preparedBy = orderModel.order.preparedBy
      ? new MiniUserOutput(orderModel.order.preparedBy)
      : null;
    this.readyAt = orderModel.order.readyAt ? orderModel.order.readyAt : null;
    this.cashedBy = orderModel.order.cashedBy
      ? new MiniUserOutput(orderModel.order.cashedBy)
      : null;
    this.cashedAt = orderModel.order.cashedAt
      ? orderModel.order.cashedAt
      : null;
    this.reportedBy = orderModel.order.reportedBy
      ? new MiniUserOutput(orderModel.order.reportedBy)
      : null;
    this.reportedAt = orderModel.order.reportedAt
      ? orderModel.order.reportedAt
      : null;
    this.refundedBy = orderModel.order.refundedBy
      ? new MiniUserOutput(orderModel.order.refundedBy)
      : null;
    this.refundedAt = orderModel.order.refundedAt
      ? orderModel.order.refundedAt
      : null;
    this.canceledBy = orderModel.order.canceledBy
      ? new MiniUserOutput(orderModel.order.canceledBy)
      : null;
    this.canceledAt = orderModel.order.canceledAt
      ? orderModel.order.canceledAt
      : null;
    this.createdBy = orderModel.order.createdBy
      ? new MiniUserOutput(orderModel.order.createdBy)
      : null;
    this.createdAt = orderModel.order.createdAt;
    this.lastUpdate = orderModel.order.lastUpdate;
  }

  id: string;
  reference: string;
  barcode: string;
  magentoId: number;
  version: OrderVersion;
  deliveryMode: DeliveryMode;
  paymentMethod: PaymentMethod;
  paymentRef?: string;
  prepaidIsRequired: boolean;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  instalments?: Instalment;
  advance?: AdvanceModel;
  guarantor?: GuarantorPayload;
  outputBy?: MiniUserPayload;
  sellerCode: string;
  preferredDeliveryDate?: Date;
  calculatedDeliveryFees?: DeliveryFees;
  fixedDeliveryFees?: number;
  storagePoint: ExtraMiniStoragePointOutput;
  articlesOrdered: ArticlesOrderedOutput[];
  voucher: VoucherItemOutput;
  subTotal: number;
  total: number;
  orderStatus: StepStatus;
  orderStep: OrderStep;
  type: OrderType;
  orderSource: OrderSource;
  billingAddress: MiniAddressOutput;
  deliveryAddress: MiniAddressOutput;
  child?: ExtraMiniOrderOutput;
  parent?: ExtraMiniOrderOutput;
  customerReturns?: MiniCustomerReturnOutput[];
  productItems?: ProductItemItemOutput[];
  transferts?: ExtraMiniTransfertOutput[];
  orderProcessings: OrderProcessingItemOutput[];
  purchaseOrder?: MiniPurchaseOrderOutput;
  stockMovements?: MiniStockMovementOutput[];
  cancelReason?: CancelReasonItem;
  comments?: CommentModel[];
  chnagesToApply?: MiniChangesToApplyOutputModel[];
  sourceVersion?: MiniOrderOutput;
  assignedBy?: MiniUserOutput;
  assignedTo?: MiniUserPayload;
  assignedAt?: Date;
  deliverValidatedBy?: MiniUserOutput;
  deliveredAt?: Date;
  pickedUpAt?: Date;
  preparedBy?: MiniUserOutput;
  readyAt?: Date;
  cashedBy?: MiniUserOutput;
  cashedAt?: Date;
  reportedBy?: MiniUserOutput;
  reportedAt?: Date;
  refundedBy?: MiniUserOutput;
  refundedAt?: Date;
  createdBy?: MiniUserOutput;
  canceledBy?: MiniUserOutput;
  canceledAt?: Date;
  createdAt: Date;
  lastUpdate: Date;
}

export class GetOrderByIdItemOutput {
  constructor(orderModel: OrderModel, lang: ISOLang) {
    this.id = orderModel.order.id;
    this.reference = orderModel.order.reference;
    this.magentoId = orderModel.order.magentoID;
    this.barcode = orderModel.order.barcode;
    this.version = orderModel.order.version;
    this.deliveryMode = orderModel.order.deliveryMode;
    this.paymentMethod = orderModel.order.paymentMethod;
    this.paymentRef = orderModel.order.paymentRef
      ? orderModel.order.paymentRef
      : null;
    this.prepaidIsRequired = orderModel.order.prepaidIsRequired;
    this.paymentMode = orderModel.order.paymentMode;
    this.paymentStatus = orderModel.order.paymentStatus;
    this.instalments = orderModel.order.instalment
      ? orderModel.order.instalment
      : null;
    this.advance = orderModel.order.advance ? orderModel.order.advance : null;
    this.guarantor = orderModel.order.guarantor
      ? orderModel.order.guarantor
      : null;
    this.outputBy = orderModel.order.outputBy
      ? orderModel.order.outputBy
      : null;
    this.sellerCode = orderModel.order.sellerCode;
    this.preferredDeliveryDate = orderModel.order.preferedDeliveryDate
      ? orderModel.order.preferedDeliveryDate
      : null;
    this.calculatedDeliveryFees = orderModel.order.calculatedDeliveryFees
      ? orderModel.order.calculatedDeliveryFees
      : null;
    this.fixedDeliveryFees = orderModel.order.fixedDeliveryFees;
    this.storagePoint = new ExtraMiniStoragePointOutput(
      orderModel.order.storagePoint,
    );
    this.articlesOrdered = orderModel.articlesOrdered.map(
      (articleOrdered) => new ArticlesOrderedOutput(articleOrdered, lang),
    );
    this.voucher = orderModel.order.voucher
      ? new VoucherItemOutput(orderModel.order.voucher)
      : null;
    this.subTotal = orderModel.order.subTotal;
    this.total = orderModel.order.total;
    this.orderStatus = orderModel.order.orderStatus;
    this.orderStep = orderModel.order.orderStep;
    this.type = orderModel.order.type;
    this.orderSource = orderModel.order.orderSource;
    this.billingAddress = new MiniAddressOutput(
      orderModel.order.billingAddress,
    );
    this.deliveryAddress = new MiniAddressOutput(
      orderModel.order.deliveryAddress,
    );
    this.productItems = orderModel.order.productItems
      ? orderModel.order.productItems.map(
          (productItem) => new ExtraMiniProductItemOutput(productItem),
        )
      : [];
    this.transferts = orderModel.order.transferts
      ? orderModel.order.transferts.map(
          (transfert) => new ExtraMiniTransfertOutputForGetOrderById(transfert),
        )
      : [];
    this.orderProcessings = orderModel.order.orderProcessings
      ? orderModel.order.orderProcessings.map(
          (orderProcessing) =>
            new MiniOrderProcessingItemOutput(orderProcessing),
        )
      : [];
    this.purchaseOrder = orderModel.order.purchaseOrder
      ? new ExtraMiniPurchaseOrderOutput(orderModel.order.purchaseOrder)
      : null;
    this.stockMovements = orderModel.order.stockMovements
      ? orderModel.order.stockMovements.map(
          (stockMovement) => new ExtraMiniStockMovementOutput(stockMovement),
        )
      : [];
    this.cancelReason = orderModel.order.cancelReason
      ? orderModel.order.cancelReason
      : null;
    this.comments = orderModel.order.comments ? orderModel.order.comments : [];
    this.chnagesToApply =
      orderModel.changesToApply && orderModel.changesToApply.length > 0
        ? orderModel.changesToApply
        : [];
    this.sourceVersion = orderModel.order.sourceId
      ? new MiniOrderOutput(orderModel.sourceVersion)
      : null;
    this.assignedBy = orderModel.order.assignedBy
      ? new MiniUserOutput(orderModel.order.assignedBy)
      : null;
    this.assignedTo = orderModel.order.assignedTo
      ? orderModel.order.assignedTo
      : null;
    this.assignedAt = orderModel.order.assignedAt
      ? orderModel.order.assignedAt
      : null;
    this.deliverValidatedBy = orderModel.order.deliverValidatedBy
      ? new MiniUserOutput(orderModel.order.deliverValidatedBy)
      : null;
    this.deliveredAt = orderModel.order.deliveredAt
      ? orderModel.order.deliveredAt
      : null;
    this.pickedUpAt = orderModel.order.pickedUpAt
      ? orderModel.order.pickedUpAt
      : null;
    this.preparedBy = orderModel.order.preparedBy
      ? new MiniUserOutput(orderModel.order.preparedBy)
      : null;
    this.readyAt = orderModel.order.readyAt ? orderModel.order.readyAt : null;
    this.cashedBy = orderModel.order.cashedBy
      ? new MiniUserOutput(orderModel.order.cashedBy)
      : null;
    this.cashedAt = orderModel.order.cashedAt
      ? orderModel.order.cashedAt
      : null;
    this.reportedBy = orderModel.order.reportedBy
      ? new MiniUserOutput(orderModel.order.reportedBy)
      : null;
    this.reportedAt = orderModel.order.reportedAt
      ? orderModel.order.reportedAt
      : null;
    this.refundedBy = orderModel.order.refundedBy
      ? new MiniUserOutput(orderModel.order.refundedBy)
      : null;
    this.refundedAt = orderModel.order.refundedAt
      ? orderModel.order.refundedAt
      : null;
    this.canceledBy = orderModel.order.canceledBy
      ? new MiniUserOutput(orderModel.order.canceledBy)
      : null;
    this.canceledAt = orderModel.order.canceledAt
      ? orderModel.order.canceledAt
      : null;
    this.createdBy = orderModel.order.createdBy
      ? new MiniUserOutput(orderModel.order.createdBy)
      : null;
    this.createdAt = orderModel.order.createdAt;
    this.lastUpdate = orderModel.order.lastUpdate;
  }

  id: string;
  reference: string;
  barcode: string;
  magentoId: number;
  version: OrderVersion;
  deliveryMode: DeliveryMode;
  paymentMethod: PaymentMethod;
  paymentRef?: string;
  prepaidIsRequired: boolean;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  instalments?: Instalment;
  advance?: AdvanceModel;
  guarantor?: GuarantorPayload;
  outputBy?: MiniUserPayload;
  sellerCode: string;
  preferredDeliveryDate?: Date;
  calculatedDeliveryFees?: DeliveryFees;
  fixedDeliveryFees?: number;
  storagePoint: ExtraMiniStoragePointOutput;
  articlesOrdered: ArticlesOrderedOutput[];
  voucher: VoucherItemOutput;
  subTotal: number;
  total: number;
  orderStatus: StepStatus;
  orderStep: OrderStep;
  type: OrderType;
  orderSource: OrderSource;
  billingAddress: MiniAddressOutput;
  deliveryAddress: MiniAddressOutput;
  productItems?: ExtraMiniProductItemOutput[];
  transferts?: ExtraMiniTransfertOutputForGetOrderById[];
  orderProcessings: MiniOrderProcessingItemOutput[];
  purchaseOrder?: ExtraMiniPurchaseOrderOutput;
  stockMovements?: ExtraMiniStockMovementOutput[];
  cancelReason?: CancelReasonItem;
  comments?: CommentModel[];
  chnagesToApply?: MiniChangesToApplyOutputModel[];
  sourceVersion?: MiniOrderOutput;
  assignedBy?: MiniUserOutput;
  assignedTo?: MiniUserPayload;
  assignedAt?: Date;
  deliverValidatedBy?: MiniUserOutput;
  deliveredAt?: Date;
  pickedUpAt?: Date;
  preparedBy?: MiniUserOutput;
  readyAt?: Date;
  cashedBy?: MiniUserOutput;
  cashedAt?: Date;
  reportedBy?: MiniUserOutput;
  reportedAt?: Date;
  refundedBy?: MiniUserOutput;
  refundedAt?: Date;
  createdBy?: MiniUserOutput;
  canceledBy?: MiniUserOutput;
  canceledAt?: Date;
  createdAt: Date;
  lastUpdate: Date;
}
