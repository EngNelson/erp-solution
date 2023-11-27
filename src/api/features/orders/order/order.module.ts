import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  MobileUnit,
  OrderProcessing,
  Reception,
  StockMovement,
  Transfert,
  VariantReception,
  VariantTransfert,
} from 'src/domain/entities/flows';
import {
  Product,
  ProductItem,
  ProductVariant,
  ProductVariantAttributeValues,
} from 'src/domain/entities/items';
import {
  Attribute,
  AttributeOption,
  AttributeSet,
  AttributeValue,
  Unit,
} from 'src/domain/entities/items/eav';
import { ArticleOrdered, Order, Voucher } from 'src/domain/entities/orders';
import {
  PurchaseOrder,
  Supplier,
  VariantPurchased,
} from 'src/domain/entities/purchases';
import { Address } from 'src/domain/entities/shared';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import { CalculateDeliveryFeesService } from 'src/services/delivery-fees';
import {
  AddressService,
  CounterService,
  LocationBarcodeService,
  LocationService,
  MobileUnitService,
  OrderService,
  ProductVariantService,
  ProductsService,
  ReportsService,
  StoragePointService,
  UpdateMagentoDataService,
} from 'src/services/generals';
import {
  ReceptionService,
  TransfertService,
} from 'src/services/references/flows';
import { OrderReferenceService } from 'src/services/references/orders';
import { PurchaseOrderReferenceService } from 'src/services/references/purchases';
import { SharedService, UserService } from 'src/services/utilities';
import { AddOrderController } from './add-order/add-order.controller';
import { AddOrderService } from './add-order/add-order.service';
import { GetOrdersController } from './get-orders/get-orders.controller';
import { GetOrdersService } from './get-orders/get-orders.service';
import { GetOrderByIdController } from './get-order-by-id/get-order-by-id.controller';
import { GetOrderByIdService } from './get-order-by-id/get-order-by-id.service';
import { ValidateOrderController } from './vaidate-order/validate-order.controller';
import { ValidateOrderService } from './vaidate-order/validate-order.service';
import { ValidateOutputController } from './validate-output/validate-output.controller';
import { ValidateOutputService } from './validate-output/validate-output.service';
import { HttpModule } from '@nestjs/axios';
import { GetOrderByBarcodeController } from './get-order-by-barcode/get-order-by-barcode.controller';
import { GetOrderByBarcodeService } from './get-order-by-barcode/get-order-by-barcode.service';
import { AssignOrdersToService } from './assign-order-to/assign-orders-to.service';
import { AssignOrdersToController } from './assign-order-to/assign-orders-to.controller';
import { ItemsReferenceService } from 'src/services/references/items';
import { ValidateDeliveryController } from './validate-delivery/validate-delivery.controller';
import { ValidateDeliveryService } from './validate-delivery/validate-delivery.service';
import { CashOrderController } from './cash-order/cash-order.controller';
import { CashOrderService } from './cash-order/cash-order.service';
import { ReportOrderController } from './report-order/report-order.controller';
import { ReportOrderService } from './report-order/report-order.service';
import { EditOrderController } from './edit-order/edit-order.controller';
import { EditOrderService } from './edit-order/edit-order.service';
import { RefundOrderController } from './refund-order/refund-order.controller';
import { RefundOrderService } from './refund-order/refund-order.service';
import {
  AreaReferenceService,
  LocationReferenceService,
} from 'src/services/references/warehouses';
import { CancelOrderController } from './cancel-order/cancel-order.controller';
import { CancelOrderService } from './cancel-order/cancel-order.service';
import { ApplyOrderChangesController } from './apply-order-changes/apply-order-changes.controller';
import { ApplyOrderChangesService } from './apply-order-changes/apply-order-changes.service';
import { SendingEmailService } from 'src/services/email';
import { Counter } from 'src/domain/entities/finance';
import { GetOrdersVariantsController } from './get-orders-variants/get-orders-variants.controller';
import { GetOrdersVariantsService } from './get-orders-variants/get-orders-variants.service';
import { Category } from 'src/domain/entities/structures';
import { SendOrderToPurchaseController } from './send-order-to-purchase/send-order-to-purchase.controller';
import { SendOrderToPurchaseService } from './send-order-to-purchase/send-order-to-purchase.service';
import { SendingSMSService } from 'src/services/sms';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      Order,
      Address,
      ProductVariant,
      Product,
      ArticleOrdered,
      Attribute,
      Unit,
      ProductVariantAttributeValues,
      ProductItem,
      Voucher,
      Location,
      StoragePoint,
      Area,
      VariantPurchased,
      PurchaseOrder,
      VariantTransfert,
      Transfert,
      Supplier,
      OrderProcessing,
      StockMovement,
      AttributeValue,
      AttributeSet,
      AttributeOption,
      Reception,
      VariantReception,
      MobileUnit,
      Counter,
      Category,
    ]),
  ],
  controllers: [
    AddOrderController,
    GetOrdersController,
    GetOrderByIdController,
    ValidateOrderController,
    ValidateOutputController,
    GetOrderByBarcodeController,
    AssignOrdersToController,
    ValidateDeliveryController,
    CashOrderController,
    ReportOrderController,
    EditOrderController,
    RefundOrderController,
    CancelOrderController,
    ApplyOrderChangesController,
    GetOrdersVariantsController,
    SendOrderToPurchaseController,
  ],
  providers: [
    OrderReferenceService,
    SharedService,
    CalculateDeliveryFeesService,
    OrderService,
    StoragePointService,
    ProductsService,
    TransfertService,
    PurchaseOrderReferenceService,
    LocationService,
    ProductVariantService,
    ProductsService,
    ItemsReferenceService,
    AddressService,
    ReceptionService,
    AreaReferenceService,
    LocationReferenceService,
    LocationBarcodeService,
    UpdateMagentoDataService,
    CounterService,
    ReportsService,
    UserService,
    MobileUnitService,
    SendingSMSService,

    AddOrderService,
    GetOrdersService,
    GetOrderByIdService,
    ValidateOrderService,
    ValidateOutputService,
    GetOrderByBarcodeService,
    AssignOrdersToService,
    ValidateDeliveryService,
    CashOrderService,
    ReportOrderService,
    EditOrderService,
    RefundOrderService,
    CancelOrderService,
    ApplyOrderChangesService,
    SendingEmailService,
    GetOrdersVariantsService,
    SendOrderToPurchaseService,
  ],
})
export class OrderModule {}
