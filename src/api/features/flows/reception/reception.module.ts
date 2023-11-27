import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  InternalNeed,
  MobileUnit,
  OrderProcessing,
  Reception,
  StockMovement,
  Transfert,
  VariantReception,
} from 'src/domain/entities/flows';
import { GetReceptionsController } from './get-receptions/get-receptions.controller';
import { GetReceptionsService } from './get-receptions/get-receptions.service';
import { GetReceptionByIdController } from './get-reception-by-id/get-reception-by-id.controller';
import { GetReceptionByIdService } from './get-reception-by-id/get-reception-by-id.service';
import {
  Product,
  ProductItem,
  ProductVariant,
  ProductVariantAttributeValues,
} from 'src/domain/entities/items';
import { ArticleOrdered, Order } from 'src/domain/entities/orders';
import {
  Attribute,
  AttributeOption,
  AttributeSet,
  AttributeValue,
  Unit,
} from 'src/domain/entities/items/eav';
import { ValidateReceptionController } from './validate-reception/validate-reception.controller';
import { ValidateReceptionService } from './validate-reception/validate-reception.service';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import { PurchaseOrder, Supplier } from 'src/domain/entities/purchases';
import { GetReceptionsToBeStoredController } from './get-receptions-to-be-stored/get-receptions-to-be-stored.controller';
import { GetReceptionsToBeStoredService } from './get-receptions-to-be-stored/get-receptions-to-be-stored.service';
import { GetReceptionToBeStoredByIdController } from './get-reception-to-be-stored-by-id/get-reception-to-be-stored-by-id.controller';
import { GetReceptionToBeStoredByIdService } from './get-reception-to-be-stored-by-id/get-reception-to-be-stored-by-id.service';
import { AddReceptionController } from './add-reception/add-reception.controller';
import { AddReceptionService } from './add-reception/add-reception.service';
import { CancelReceptionController } from './cancel-reception/cancel-reception.controller';
import { CancelReceptionService } from './cancel-reception/cancel-reception.service';

import {
  LocationBarcodeService,
  MobileUnitService,
  OrderService,
  ProductItemBarcodeService,
  ProductsService,
  ProductVariantService,
  ReportsService,
  StoragePointService,
  UpdateMagentoDataService,
} from 'src/services/generals';
import { SharedService, UserService } from 'src/services/utilities';
import { ReceptionService } from 'src/services/references/flows';
import { ItemsReferenceService } from 'src/services/references/items';
import {
  AreaReferenceService,
  LocationReferenceService,
} from 'src/services/references/warehouses';
import { OrderReferenceService } from 'src/services/references/orders';
import { GetReceptionsVariantsController } from './get-receptions-variants/get-receptions-variants.controller';
import { GetReceptionsVariantsService } from './get-receptions-variants/get-receptions-variants.service';
import { Category } from 'src/domain/entities/structures';
import { HttpModule } from '@nestjs/axios';
import { EditReceptionService } from './edit-reception/edit-reception.service';
import { EditReceptionController } from './edit-reception/edit-reception.controller';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      Reception,
      ProductVariant,
      Order,
      Transfert,
      InternalNeed,
      Attribute,
      ProductItem,
      VariantReception,
      MobileUnit,
      StoragePoint,
      Location,
      Area,
      PurchaseOrder,
      StockMovement,
      ArticleOrdered,
      Product,
      Unit,
      Supplier,
      ProductVariantAttributeValues,
      OrderProcessing,
      Category,
      AttributeValue,
      AttributeSet,
      AttributeOption,
    ]),
  ],
  controllers: [
    GetReceptionsController,
    GetReceptionByIdController,
    ValidateReceptionController,
    GetReceptionsToBeStoredController,
    GetReceptionToBeStoredByIdController,
    AddReceptionController,
    CancelReceptionController,
    GetReceptionsVariantsController,
    EditReceptionController,
  ],
  providers: [
    ReceptionService,
    LocationBarcodeService,
    LocationReferenceService,
    AreaReferenceService,
    ItemsReferenceService,
    OrderReferenceService,
    ReportsService,
    ProductVariantService,
    ProductsService,
    MobileUnitService,
    UpdateMagentoDataService,
    UserService,
    OrderService,
    StoragePointService,

    ProductItemBarcodeService,
    SharedService,
    GetReceptionsService,
    GetReceptionByIdService,
    ValidateReceptionService,
    GetReceptionsToBeStoredService,
    GetReceptionToBeStoredByIdService,
    AddReceptionService,
    CancelReceptionService,
    GetReceptionsVariantsService,
    EditReceptionService,
  ],
})
export class ReceptionModule {}
