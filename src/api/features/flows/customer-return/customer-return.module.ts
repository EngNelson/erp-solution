import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CustomerReturn,
  Reception,
  StockMovement,
  Transfert,
  VariantReception,
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
import { Order } from 'src/domain/entities/orders';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import {
  CustomerReturnService,
  LocationBarcodeService,
  MobileUnitService,
  ProductsService,
  ProductVariantService,
  StoragePointService,
  UpdateMagentoDataService,
} from 'src/services/generals';
import {
  CustomerReturnReferenceService,
  ReceptionService,
} from 'src/services/references/flows';
import {
  AreaReferenceService,
  LocationReferenceService,
} from 'src/services/references/warehouses';

import { SharedService, UserService } from 'src/services/utilities';

import { AddCustomerReturnController } from './add-customer-return/add-customer-return.controller';
import { AddCustomerReturnService } from './add-customer-return/add-customer-return.service';
import { GetCustomerReturnByIdController } from './get-customer-return-by-id/get-customer-return-by-id.controller';
import { GetCustomerReturnByIdService } from './get-customer-return-by-id/get-customer-return-by-id.service';
import { PurchaseOrder, Supplier } from 'src/domain/entities/purchases';
import { GetCustomerReturnsController } from './get-customer-returns/get-customer-returns.controller';
import { GetCustomerReturnsService } from './get-customer-returns/get-customer-returns.service';
import { ValidateCustomerReturnController } from './validate-customer-return/validate-customer-return.controller';
import { ValidateCustomerReturnService } from './validate-customer-return/validate-customer-return.service';
import { ItemsReferenceService } from 'src/services/references/items';
import { CancelCustomerReturnController } from './cancel-customer-return/cancel-customer-return.controller';
import { CancelCustomerReturnService } from './cancel-customer-return/cancel-customer-return.service';
import { ResolveCustomerReturnController } from './resolve-customer-return/resolve-customer-return.controller';
import { ResolveCustomerReturnService } from './resolve-customer-return/resolve-customer-return.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      CustomerReturn,
      StoragePoint,
      Order,
      ProductItem,
      StockMovement,
      Area,
      Location,
      Product,
      ProductVariant,
      Attribute,
      Unit,
      ProductVariantAttributeValues,
      Reception,
      Supplier,
      VariantReception,
      AttributeValue,
      AttributeSet,
      AttributeOption,
      CustomerReturn,
      PurchaseOrder,
      Transfert,
    ]),
  ],
  controllers: [
    AddCustomerReturnController,
    GetCustomerReturnsController,
    GetCustomerReturnByIdController,
    ValidateCustomerReturnController,
    CancelCustomerReturnController,
    ResolveCustomerReturnController,
  ],
  providers: [
    CustomerReturnReferenceService,
    SharedService,
    LocationBarcodeService,
    LocationReferenceService,
    StoragePointService,
    AreaReferenceService,
    ReceptionService,
    ProductVariantService,
    ProductsService,
    ItemsReferenceService,
    CustomerReturnService,
    UpdateMagentoDataService,
    UserService,
    MobileUnitService,

    GetCustomerReturnsService,
    AddCustomerReturnService,
    GetCustomerReturnByIdService,
    ValidateCustomerReturnService,
    GetCustomerReturnsService,
    AddCustomerReturnService,
    GetCustomerReturnByIdService,
    CancelCustomerReturnService,
    ResolveCustomerReturnService,
  ],
})
export class CustomerReturnModule {}
