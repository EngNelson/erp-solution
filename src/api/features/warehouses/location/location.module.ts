import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddLocationController } from './add-location/add-location.controller';
import { AddLocationService } from './add-location/add-location.service';
import { EditLocationController } from './edit-location/edit-location.controller';
import { EditLocationService } from './edit-location/edit-location.service';
import { GetLocationByIdController } from './get-location-by-id/get-location-by-id.controller';
import { GetLocationByIdService } from './get-location-by-id/get-location-by-id.service';
import { GetLocationTreeByIdController } from './get-location-tree-by-id/get-location-tree-by-id.controller';
import { GetLocationTreeByIdService } from './get-location-tree-by-id/get-location-tree-by-id.service';
import { GetLocationProductItemsController } from './get-location-product-items/get-location-product-items.controller';
import { GetLocationProductItemsService } from './get-location-product-items/get-location-product-items.service';
import { DeleteLocationController } from './delete-location/delete-location.controller';
import { DeleteLocationService } from './delete-location/delete-location.service';
import { MergeLocationsController } from './merge-locations/merge-locations.controller';
import { MergeLocationsService } from './merge-locations/merge-locations.service';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
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
import { GetLocationProductVariantsController } from './get-location-product-variants/get-location-product-variants.controller';
import { GetLocationProductVariantsService } from './get-location-product-variants/get-location-product-variants.service';
import { GetLocationByBarcodeController } from './get-location-by-barcode/get-location-by-barcode.controller';
import { GetLocationByBarcodeService } from './get-location-by-barcode/get-location-by-barcode.service';
import { AddItemsToLocationController } from './add-items-to-location/add-items-to-location.controller';
import { AddItemsToLocationService } from './add-items-to-location/add-items-to-location.service';
import {
  MobileUnit,
  OtherOutput,
  StockMovement,
} from 'src/domain/entities/flows';
import { SharedService } from 'src/services/utilities/shared.service';
import {
  BuildMergeLocationsMappingService,
  LocationBarcodeService,
  ProductsService,
  ProductVariantService,
  UpdateMagentoDataService,
} from 'src/services/generals';
import { LocationReferenceService } from 'src/services/references/warehouses';
import { Supplier } from 'src/domain/entities/purchases';
import { ItemsReferenceService } from 'src/services/references/items';
import { HttpModule } from '@nestjs/axios';
import { Order } from 'src/domain/entities/orders';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      Location,
      Area,
      Product,
      ProductItem,
      ProductVariant,
      Attribute,
      Unit,
      StockMovement,
      ProductVariantAttributeValues,
      StoragePoint,
      Supplier,
      AttributeValue,
      AttributeSet,
      AttributeOption,
      Order,
      MobileUnit,
      OtherOutput,
    ]),
  ],
  controllers: [
    AddLocationController,
    EditLocationController,
    GetLocationByIdController,
    GetLocationTreeByIdController,
    GetLocationProductItemsController,
    DeleteLocationController,
    MergeLocationsController,
    GetLocationProductVariantsController,
    GetLocationByBarcodeController,
    AddItemsToLocationController,
  ],
  providers: [
    LocationBarcodeService,
    LocationReferenceService,
    BuildMergeLocationsMappingService,
    SharedService,
    ProductVariantService,
    ProductsService,
    ItemsReferenceService,
    UpdateMagentoDataService,

    AddLocationService,
    EditLocationService,
    GetLocationByIdService,
    GetLocationTreeByIdService,
    GetLocationProductItemsService,
    DeleteLocationService,
    MergeLocationsService,
    GetLocationProductVariantsService,
    GetLocationByBarcodeService,
    AddItemsToLocationService,
  ],
})
export class LocationModule {}
