import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddAreaController } from './add-area/add-area.controller';
import { AddAreaService } from './add-area/add-area.service';
import { EditAreaController } from './edit-area/edit-area.controller';
import { EditAreaService } from './edit-area/edit-area.service';
import { GetAreaByIdController } from './get-area-by-id/get-area-by-id.controller';
import { GetAreaByIdService } from './get-area-by-id/get-area-by-id.service';
import { MergeAreasController } from './merge-areas/merge-areas.controller';
import { MergeAreasService } from './merge-areas/merge-areas.service';
import { DeleteAreaController } from './delete-area/delete-area.controller';
import { DeleteAreaService } from './delete-area/delete-area.service';
import { GetAreaTreeByIdController } from './get-area-tree-by-id/get-area-tree-by-id.controller';
import { GetAreaTreeByIdService } from './get-area-tree-by-id/get-area-tree-by-id.service';
import { GetLocationsByAreaController } from './get-locations-by-area/get-locations-by-area.controller';
import { GetLocationsByAreaService } from './get-locations-by-area/get-locations-by-area.service';
import {
  Product,
  ProductItem,
  ProductVariant,
  ProductVariantAttributeValues,
} from 'src/domain/entities/items';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import {
  BuildMergeLocationsMappingService,
  LocationBarcodeService,
} from 'src/services/generals';
import {
  AreaReferenceService,
  LocationReferenceService,
} from 'src/services/references/warehouses';
import { SharedService } from 'src/services/utilities';
import { Attribute, Unit } from 'src/domain/entities/items/eav';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Area,
      StoragePoint,
      Location,
      ProductItem,
      Attribute,
      Unit,
      ProductVariant,
      ProductVariantAttributeValues,
      Product,
    ]),
  ],
  controllers: [
    AddAreaController,
    EditAreaController,
    GetAreaByIdController,
    MergeAreasController,
    DeleteAreaController,
    GetAreaTreeByIdController,
    GetLocationsByAreaController,
  ],
  providers: [
    LocationBarcodeService,
    BuildMergeLocationsMappingService,
    AreaReferenceService,
    SharedService,
    LocationReferenceService,

    AddAreaService,
    EditAreaService,
    GetAreaByIdService,
    MergeAreasService,
    DeleteAreaService,
    GetAreaTreeByIdService,
    GetLocationsByAreaService,
  ],
})
export class AreaModule {}
