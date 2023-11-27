import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  MobileUnit,
  OrderProcessing,
  PickingList,
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
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import { AddTransfertController } from './add-transfert/add-transfert.controller';
import { AddTransfertService } from './add-transfert/add-transfert.service';
import { GetTransfertByIdController } from './get-transfert-by-id/get-transfert-by-id.controller';
import { GetTransfertByIdService } from './get-transfert-by-id/get-transfert-by-id.service';
import { GetTransfertsController } from './get-transferts/get-transferts.controller';
import { GetTransfertsService } from './get-transferts/get-transferts.service';
import { SearchTransfertsByReferenceController } from './search-transferts-by-reference/search-transferts-by-reference.controller';
import { SearchTransfertsByReferenceService } from './search-transferts-by-reference/search-transferts-by-reference.service';
import { ConfirmTransfertController } from './confirm-transfert/confirm-transfert.controller';
import { ConfirmTransfertService } from './confirm-transfert/confirm-transfert.service';
import { ValidateTransfertController } from './validate-transfert/validate-transfert.controller';
import { ValidateTransfertService } from './validate-transfert/validate-transfert.service';
import { CancelTransfertController } from './cancel-transfert/cancel-transfert.controller';
import { CancelTransfertService } from './cancel-transfert/cancel-transfert.service';
import { ArticleOrdered, Order } from 'src/domain/entities/orders';

import { SharedService, UserService } from 'src/services/utilities';
import {
  PickingListReferenceService,
  ReceptionService,
  TransfertService,
} from 'src/services/references/flows';
import { GetTransfertsVariantsController } from './get-transferts-variants/get-transferts-variants.controller';
import { GetTransfertsVariantsService } from './get-transferts-variants/get-transferts-variants.service';
import {
  LocationBarcodeService,
  MobileUnitService,
  OrderService,
  ProductsService,
  ProductVariantService,
  ReportsService,
  StoragePointService,
} from 'src/services/generals';
import { Category } from 'src/domain/entities/structures';
import { SendingEmailService } from 'src/services/email';
import { HttpModule } from '@nestjs/axios';
import {
  PurchaseOrder,
  Supplier,
  VariantPurchased,
} from 'src/domain/entities/purchases';
import { ItemsReferenceService } from 'src/services/references/items';
import { EditTransfertService } from './edit-transfert/edit-transfert.service';
import { EditTransfertController } from './edit-transfert/edit-transfert.controller';
import { BullModule } from '@nestjs/bull';
import { SENDING_EMAIL_QUEUE } from 'src/domain/constants';
import {
  AreaReferenceService,
  LocationReferenceService,
} from 'src/services/references/warehouses';
import { PurchaseOrderReferenceService } from 'src/services/references/purchases';
import { OrderReferenceService } from 'src/services/references/orders';

@Module({
  imports: [
    BullModule.registerQueue({
      name: SENDING_EMAIL_QUEUE,
    }),
    HttpModule,
    TypeOrmModule.forFeature([
      Transfert,
      StoragePoint,
      Location,
      ProductVariant,
      VariantTransfert,
      Attribute,
      MobileUnit,
      ProductItem,
      Reception,
      Order,
      Product,
      StockMovement,
      Unit,
      PickingList,
      ProductVariantAttributeValues,
      Area,
      Category,
      Supplier,
      AttributeValue,
      AttributeSet,
      AttributeOption,
      PurchaseOrder,
      VariantPurchased,
      VariantReception,
      OrderProcessing,
      ArticleOrdered,
    ]),
  ],
  controllers: [
    AddTransfertController,
    GetTransfertByIdController,
    GetTransfertsController,
    SearchTransfertsByReferenceController,
    ConfirmTransfertController,
    ValidateTransfertController,
    CancelTransfertController,
    GetTransfertsVariantsController,
    EditTransfertController,
  ],
  providers: [
    TransfertService,
    ReceptionService,
    PickingListReferenceService,
    SharedService,
    ReportsService,
    ProductVariantService,
    ProductsService,
    SendingEmailService,
    MobileUnitService,
    ItemsReferenceService,
    UserService,
    StoragePointService,
    AreaReferenceService,
    LocationReferenceService,
    LocationBarcodeService,
    PurchaseOrderReferenceService,
    OrderService,
    OrderReferenceService,

    AddTransfertService,
    GetTransfertByIdService,
    GetTransfertsService,
    SearchTransfertsByReferenceService,
    ConfirmTransfertService,
    ValidateTransfertService,
    CancelTransfertService,
    GetTransfertsVariantsService,
    EditTransfertService,
  ],
})
export class TransfertModule {}
