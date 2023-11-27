import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Address } from 'src/domain/entities/shared';
import { AddStoragePointController } from './add-storage-point/add-storage-point.controller';
import { AddStoragePointService } from './add-storage-point/add-storage-point.service';
import { GetStoragePointsController } from './get-storage-points/get-storage-points.controller';
import { GetStoragePointsService } from './get-storage-points/get-storage-points.service';
import { GetStoragePointByIdController } from './get-storage-point-by-id/get-storage-point-by-id.controller';
import { GetStoragePointByIdService } from './get-storage-point-by-id/get-storage-point-by-id.service';
import { EditStoragePointController } from './edit-storage-point/edit-storage-point.controller';
import { EditStoragePointService } from './edit-storage-point/edit-storage-point.service';
import { DeleteStoragePointController } from './delete-storage-point/delete-storage-point.controller';
import { DeleteStoragePointService } from './delete-storage-point/delete-storage-point.service';
import { MergeStoragePointsController } from './merge-storage-points/merge-storage-points.controller';
import { MergeStoragePointsService } from './merge-storage-points/merge-storage-points.service';
import { GetStoragePointTreeByIdController } from './get-storage-point-tree-by-id/get-storage-point-tree-by-id.controller';
import { GetStoragePointTreeByIdService } from './get-storage-point-tree-by-id/get-storage-point-tree-by-id.service';
import { GetAreasByStoragePointController } from './get-areas-by-storage-point/get-areas-by-storage-point.controller';
import { GetAreasByStoragePointService } from './get-areas-by-storage-point/get-areas-by-storage-point.service';
import { GetLocationsByStoragePointController } from './get-locations-by-storage-point/get-locations-by-storage-point.controller';
import { GetLocationsByStoragePointService } from './get-locations-by-storage-point/get-locations-by-storage-point.service';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import {
  Product,
  ProductItem,
  ProductVariant,
  ProductVariantAttributeValues,
} from 'src/domain/entities/items';
import { GetStoragePointInventoriesController } from './get-storage-point-inventories/get-storage-point-inventories.controller';
import { GetStoragePointInventoriesService } from './get-storage-point-inventories/get-storage-point-inventories.service';
import { Inventory } from 'src/domain/entities/flows';
import { LocationBarcodeService } from 'src/services/generals';
import {
  AreaReferenceService,
  LocationReferenceService,
  WarehouseReferenceService,
} from 'src/services/references/warehouses';
import { SharedService } from 'src/services/utilities';
import { Attribute, Unit } from 'src/domain/entities/items/eav';
import { HttpModule } from '@nestjs/axios';
import { GetStoragePointByReferenceController } from './get-storage-point-by-reference/get-storage-point-by-reference.controller';
import { GetStoragePointByReferenceService } from './get-storage-point-by-reference/get-storage-point-by-reference.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      StoragePoint,
      Address,
      Area,
      Location,
      ProductItem,
      Inventory,
      Attribute,
      Unit,
      ProductVariant,
      ProductVariantAttributeValues,
      Product,
    ]),
  ],
  controllers: [
    AddStoragePointController,
    GetStoragePointsController,
    GetStoragePointByIdController,
    EditStoragePointController,
    DeleteStoragePointController,
    MergeStoragePointsController,
    GetStoragePointTreeByIdController,
    GetAreasByStoragePointController,
    GetLocationsByStoragePointController,
    GetStoragePointInventoriesController,
    GetStoragePointByReferenceController,
  ],
  providers: [
    LocationBarcodeService,
    LocationReferenceService,
    SharedService,
    AreaReferenceService,
    WarehouseReferenceService,

    AddStoragePointService,
    GetStoragePointsService,
    GetStoragePointByIdService,
    EditStoragePointService,
    DeleteStoragePointService,
    MergeStoragePointsService,
    GetStoragePointTreeByIdService,
    GetAreasByStoragePointService,
    GetLocationsByStoragePointService,
    GetStoragePointInventoriesService,
    GetStoragePointByReferenceService,
  ],
})
export class StoragePointModule {}
