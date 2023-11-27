import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category, Collection } from 'src/domain/entities/structures';
import { AddCollectionController } from './add-collection/add-collection.controller';
import { AddCollectionService } from './add-collection/add-collection.service';
import { EditCollectionController } from './edit-collection/edit-collection.controller';
import { EditCollectionService } from './edit-collection/edit-collection.service';
import { GetCollectionsController } from './get-collections/get-collections.controller';
import { GetCollectionsService } from './get-collections/get-collections.service';
import { GetCollectionByIdController } from './get-collection-by-id/get-collection-by-id.controller';
import { GetCollectionByIdService } from './get-collection-by-id/get-collection-by-id.service';
import { GetCollectionTreeByIdController } from './get-collection-tree-by-id/get-collection-tree-by-id.controller';
import { GetCollectionTreeByIdService } from './get-collection-tree-by-id/get-collection-tree-by-id.service';
import { GetCollectionsByIdsController } from './get-collections-by-ids/get-collections-by-ids.controller';
import { GetCollectionsByIdsService } from './get-collections-by-ids/get-collections-by-ids.service';
import { Attribute, Unit } from 'src/domain/entities/items/eav';
import {
  Product,
  ProductItem,
  ProductVariant,
  ProductVariantAttributeValues,
} from 'src/domain/entities/items';
import { DisableCollectionsController } from './disable-collections/disable-collections.controller';
import { DisableCollectionsService } from './disable-collections/disable-collections.service';
import { EnableCollectionsController } from './enable-collections/enable-collections.controller';
import { EnableCollectionsService } from './enable-collections/enable-collections.service';
import { DeleteCollectionsController } from './delete-collections/delete-collections.controller';
import { DeleteCollectionsService } from './delete-collections/delete-collections.service';
import { SharedService } from 'src/services/utilities';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Collection,
      Category,
      Attribute,
      Unit,
      ProductVariant,
      ProductItem,
      Product,
      ProductVariantAttributeValues,
      Location,
      StoragePoint,
      Area,
    ]),
  ],
  controllers: [
    AddCollectionController,
    EditCollectionController,
    GetCollectionsController,
    GetCollectionByIdController,
    GetCollectionTreeByIdController,
    GetCollectionsByIdsController,
    DisableCollectionsController,
    EnableCollectionsController,
    DeleteCollectionsController,
  ],
  providers: [
    SharedService,

    AddCollectionService,

    EditCollectionService,

    GetCollectionsService,

    GetCollectionByIdService,

    GetCollectionTreeByIdService,

    GetCollectionsByIdsService,

    DisableCollectionsService,

    EnableCollectionsService,

    DeleteCollectionsService,
  ],
})
export class CollectionModule {}
