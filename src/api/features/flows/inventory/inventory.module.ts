import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Inventory,
  InventoryState,
  Investigation,
  StockMovement,
} from 'src/domain/entities/flows';
import {
  Product,
  ProductItem,
  ProductVariant,
  ProductVariantAttributeValues,
} from 'src/domain/entities/items';
import { Attribute, Unit } from 'src/domain/entities/items/eav';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import { AddInventoryController } from './add-inventory/add-inventory.controller';
import { AddInventoryService } from './add-inventory/add-inventory.service';
import { EditInventoryController } from './edit-inventory/edit-inventory.controller';
import { EditInventoryService } from './edit-inventory/edit-inventory.service';
import { GetInventoryByIdController } from './get-inventory-by-id/get-inventory-by-id.controller';
import { GetInventoryByIdService } from './get-inventory-by-id/get-inventory-by-id.service';
import { ConfirmInventoryController } from './confirm-inventory/confirm-inventory.controller';
import { ConfirmInventoryService } from './confirm-inventory/confirm-inventory.service';
import { ValidateInventoryController } from './validate-inventory/validate-inventory.controller';
import { ValidateInventoryService } from './validate-inventory/validate-inventory.service';
import { CancelInventoryController } from './cancel-inventory/cancel-inventory.controller';
import { CancelInventoryService } from './cancel-inventory/cancel-inventory.service';
import {
  InventoryUtilitiesService,
  SharedService,
} from 'src/services/utilities';

import {
  LocationBarcodeService,
  UpdateMagentoDataService,
} from 'src/services/generals';
import {
  InventoryReferenceService,
  InvestigationReferenceService,
} from 'src/services/references/flows';
import { LocationReferenceService } from 'src/services/references/warehouses';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      Inventory,
      InventoryState,
      Location,
      Area,
      StoragePoint,
      Attribute,
      Unit,
      ProductVariant,
      ProductItem,
      Product,
      StockMovement,
      Investigation,
      ProductVariantAttributeValues,
    ]),
  ],
  controllers: [
    AddInventoryController,
    EditInventoryController,
    GetInventoryByIdController,
    ConfirmInventoryController,
    ValidateInventoryController,
    CancelInventoryController,
  ],
  providers: [
    InventoryUtilitiesService,
    InventoryReferenceService,
    SharedService,
    LocationBarcodeService,
    LocationReferenceService,
    InvestigationReferenceService,
    UpdateMagentoDataService,

    AddInventoryService,
    EditInventoryService,
    GetInventoryByIdService,
    ConfirmInventoryService,
    ValidateInventoryService,
    CancelInventoryService,
  ],
})
export class InventoryModule {}
