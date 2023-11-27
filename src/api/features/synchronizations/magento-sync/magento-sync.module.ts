import { Module } from '@nestjs/common';
import { ImportEavAndSuppliersController } from './import-eav-and-suppliers/import-eav-and-suppliers.controller';
import { ImportEavAndSuppliersService } from './import-eav-and-suppliers/import-eav-and-suppliers.service';
import { ImportCatalogController } from './import-catalog/import-catalog.controller';
import { ImportCatalogService } from './import-catalog/import-catalog.service';
import { ImportArticlesController } from './import-articles/import-articles.controller';
import { ImportArticlesService } from './import-articles/import-articles.service';
import { UpdateEavAndSuppliersController } from './update-eav-and-suppliers/update-eav-and-suppliers.controller';
import { UpdateEavAndSuppliersService } from './update-eav-and-suppliers/update-eav-and-suppliers.service';
import { UpdateCatalogController } from './update-catalog/update-catalog.controller';
import { UpdateCatalogService } from './update-catalog/update-catalog.service';
import { UpdateArticlesController } from './update-articles/update-articles.controller';
import { UpdateArticlesService } from './update-articles/update-articles.service';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CrawlActivity,
  CrawlCache,
  CrawlFailure,
  SynchronizationHistory,
} from 'src/domain/entities/magento';
import {
  CategoryService,
  CrawlArticlesService,
  CrawlEavService,
  LocationBarcodeService,
  MobileUnitService,
  OrderService,
  ProductVariantService,
  ProductsService,
  StoragePointService,
  UpdateMagentoDataService,
} from 'src/services/generals';
import {
  Attribute,
  AttributeOption,
  AttributeSet,
  AttributeValue,
  Unit,
} from 'src/domain/entities/items/eav';
import { Category, Collection } from 'src/domain/entities/structures';
import {
  Product,
  ProductComposition,
  ProductItem,
  ProductVariant,
  ProductVariantAttributeValues,
} from 'src/domain/entities/items';
import { ItemsReferenceService } from 'src/services/references/items';
import {
  SharedService,
  SyncConfigs,
  UserService,
} from 'src/services/utilities';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import {
  PurchaseOrder,
  Supplier,
  VariantPurchased,
} from 'src/domain/entities/purchases';
import { ArticleOrdered, Order, Voucher } from 'src/domain/entities/orders';
import { SyncOrdersService } from './sync-orders/sync-orders.service';
import {
  OrderProcessing,
  Transfert,
  VariantTransfert,
} from 'src/domain/entities/flows';
import {
  AreaReferenceService,
  LocationReferenceService,
} from 'src/services/references/warehouses';
import { Address } from 'src/domain/entities/shared';
import { OrderReferenceService } from 'src/services/references/orders';
import { TransfertService } from 'src/services/references/flows';
import { PurchaseOrderReferenceService } from 'src/services/references/purchases';
import { SyncCatalogService } from './sync-catalog/sync-catalog.service';
import { SyncOrderByIdController } from './sync-order-by-id/sync-order-by-id.controller';
import { SyncOrderByIdService } from './sync-order-by-id/sync-order-by-id.service';
import { SyncOrderByReferenceController } from './sync-order-by-reference/sync-order-by-reference.controller';
import { SyncOrderByReferenceService } from './sync-order-by-reference/sync-order-by-reference.service';
import { SyncVariantBySKUController } from './sync-variant-by-sku/sync-variant-by-sku.controller';
import { SyncVariantBySKUService } from './sync-variant-by-sku/sync-variant-by-sku.service';
import { SendingSMSService } from 'src/services/sms';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      CrawlActivity,
      CrawlCache,
      CrawlFailure,
      Unit,
      Category,
      Collection,
      AttributeSet,
      Product,
      ProductVariant,
      ProductItem,
      Attribute,
      ProductVariantAttributeValues,
      Location,
      Area,
      AttributeValue,
      Supplier,
      AttributeOption,
      Voucher,
      ProductComposition,
      Order,
      ArticleOrdered,
      StoragePoint,
      PurchaseOrder,
      Transfert,
      SynchronizationHistory,
      Address,
      OrderProcessing,
      VariantTransfert,
      VariantPurchased,
    ]),
  ],
  controllers: [
    ImportEavAndSuppliersController,
    ImportCatalogController,
    ImportArticlesController,
    UpdateEavAndSuppliersController,
    UpdateCatalogController,
    UpdateArticlesController,
    SyncOrderByIdController,
    SyncOrderByReferenceController,
    SyncVariantBySKUController,
  ],
  providers: [
    CrawlArticlesService,
    CrawlEavService,
    ItemsReferenceService,
    SharedService,
    ItemsReferenceService,
    ProductVariantService,
    CategoryService,
    SyncOrdersService,
    OrderService,
    StoragePointService,
    ProductsService,
    AreaReferenceService,
    LocationReferenceService,
    LocationBarcodeService,
    OrderReferenceService,
    TransfertService,
    PurchaseOrderReferenceService,
    SyncConfigs,
    UpdateMagentoDataService,
    MobileUnitService,
    UserService,
    SendingSMSService,

    ImportEavAndSuppliersService,
    ImportCatalogService,
    ImportArticlesService,
    UpdateEavAndSuppliersService,
    UpdateCatalogService,
    UpdateArticlesService,
    SyncCatalogService,
    SyncOrderByIdService,
    SyncOrderByReferenceService,
    SyncVariantBySKUService,
  ],
})
export class MagentoSyncModule {}
