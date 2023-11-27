import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  InternalNeed,
  OrderProcessing,
  Reception,
  Transfert,
  VariantReception,
} from 'src/domain/entities/flows';
import {
  Product,
  ProductItem,
  ProductVariant,
  ProductVariantAttributeValues,
  VariantComposition,
} from 'src/domain/entities/items';
import {
  Attribute,
  AttributeOption,
  AttributeSet,
  AttributeValue,
  Unit,
} from 'src/domain/entities/items/eav';
import { Order } from 'src/domain/entities/orders';
import {
  PurchaseOrder,
  Supplier,
  VariantPurchased,
} from 'src/domain/entities/purchases';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';

import { AddPurchaseOrderController } from './add-purchase-order/add-purchase-order.controller';
import { AddPurchaseOrderService } from './add-purchase-order/add-purchase-order.service';
import { GetPurchaseOrderByIdController } from './get-purchase-order-by-id/get-purchase-order-by-id.controller';
import { GetPurchaseOrderByIdService } from './get-purchase-order-by-id/get-purchase-order-by-id.service';
import { ValidatePurchaseOrderController } from './validate-purchase-order/validate-purchase-order.controller';
import { ValidatePurchaseOrderService } from './validate-purchase-order/validate-purchase-order.service';
import { GetPurchaseOrdersController } from './get-purchase-orders/get-purchase-orders.controller';
import { GetPurchaseOrdersService } from './get-purchase-orders/get-purchase-orders.service';
import { CancelPurchaseOrderController } from './cancel-purchase-order/cancel-purchase-order.controller';
import { CancelPurchaseOrderService } from './cancel-purchase-order/cancel-purchase-order.service';
import { SharedService, UserService } from 'src/services/utilities';
import { ReceptionService } from 'src/services/references/flows';
import { PurchaseOrderReferenceService } from 'src/services/references/purchases';
import { EditPurchaseOrderController } from './edit-purchase-order/edit-purchase-order.controller';
import { EditPurchaseOrderService } from './edit-purchase-order/edit-purchase-order.service';
import { GetPurchaseOrdersVariantsController } from './get-purchase-orders-variants/get-purchase-orders-variants.controller';
import { GetPurchaseOrdersVariantsService } from './get-purchase-orders-variants/get-purchase-orders-variants.service';
import { Category } from 'src/domain/entities/structures';
import {
  MobileUnitService,
  ProductVariantService,
  PurchaseOrderService,
  ReportsService,
} from 'src/services/generals';
import { HttpModule } from '@nestjs/axios';
import { ItemsReferenceService } from 'src/services/references/items';
import { OrderReferenceService } from 'src/services/references/orders';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      PurchaseOrder,
      StoragePoint,
      Order,
      InternalNeed,
      Product,
      ProductVariant,
      ProductItem,
      VariantPurchased,
      Attribute,
      Reception,
      VariantReception,
      Supplier,
      Unit,
      ProductVariantAttributeValues,
      Location,
      Area,
      VariantComposition,
      Category,
      AttributeValue,
      AttributeSet,
      AttributeOption,
      Transfert,
      OrderProcessing,
    ]),
  ],
  controllers: [
    AddPurchaseOrderController,
    GetPurchaseOrderByIdController,
    ValidatePurchaseOrderController,
    GetPurchaseOrdersController,
    CancelPurchaseOrderController,
    EditPurchaseOrderController,
    GetPurchaseOrdersVariantsController,
  ],
  providers: [
    PurchaseOrderReferenceService,
    ReceptionService,
    SharedService,
    ReportsService,
    ProductVariantService,
    ItemsReferenceService,
    PurchaseOrderService,
    UserService,
    MobileUnitService,
    OrderReferenceService,

    AddPurchaseOrderService,
    GetPurchaseOrderByIdService,
    ValidatePurchaseOrderService,
    GetPurchaseOrdersService,
    CancelPurchaseOrderService,
    EditPurchaseOrderService,
    GetPurchaseOrdersVariantsService,
  ],
})
export class PurchaseOrderModule {}
