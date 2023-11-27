import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AuthModule } from './api/auth/auth.module';
import { WarehouseModule } from './api/features/analytics/warehouse/warehouse.module';
import { AttributeSetModule } from './api/features/eav/attribute-set/attribute-set.module';
import { AttributeModule } from './api/features/eav/attribute/attribute.module';
import { UnitModule } from './api/features/eav/unit/unit.module';
import { CustomerReturnModule } from './api/features/flows/customer-return/customer-return.module';
import { InternalNeedModule } from './api/features/flows/internal-need/internal-need.module';
import { InventoryModule } from './api/features/flows/inventory/inventory.module';
import { InvestigationModule } from './api/features/flows/investigation/investigation.module';
import { MobileUnitModule } from './api/features/flows/mobile-unit/mobile-unit.module';
import { OtherOutputModule } from './api/features/flows/other-output/other-output.module';
import { ReceptionModule } from './api/features/flows/reception/reception.module';
import { TransfertModule } from './api/features/flows/transfert/transfert.module';
import { ProductItemModule } from './api/features/items/product-item/product-item.module';
import { ProductVariantModule } from './api/features/items/product-variant/product-variant.module';
import { ProductModule } from './api/features/items/product/product.module';
import { OrderModule } from './api/features/orders/order/order.module';
import { PurchaseOrderModule } from './api/features/purchases/purchase-order/purchase-order.module';
import { SupplierModule } from './api/features/purchases/supplier/supplier.module';
import { AddressModule } from './api/features/shared/address/address.module';
import { CategoryModule } from './api/features/structures/category/category.module';
import { CollectionModule } from './api/features/structures/collection/collection.module';
import { MagentoSyncModule } from './api/features/synchronizations/magento-sync/magento-sync.module';
import { AreaModule } from './api/features/warehouses/area/area.module';
import { LocationModule } from './api/features/warehouses/location/location.module';
import { StoragePointModule } from './api/features/warehouses/storage-point/storage-point.module';
import {
  CustomerReturn,
  InternalNeed,
  Inventory,
  InventoryState,
  Investigation,
  MobileUnit,
  OrderProcessing,
  OtherOutput,
  PickingList,
  Reception,
  StockMovement,
  SupplierReturn,
  Transfert,
  VariantNeeded,
  VariantReception,
  VariantToOutput,
  VariantTransfert,
} from './domain/entities/flows';
import {
  DeliveryService,
  ExtraPackaging,
  InstallationService,
  Product,
  ProductComposition,
  ProductItem,
  ProductVariant,
  ProductVariantAttributeValues,
  Service,
  ServiceComposition,
  VariantComposition,
  WarrantyService,
} from './domain/entities/items';
import {
  Attribute,
  AttributeOption,
  AttributeSet,
  AttributeValue,
  Unit,
} from './domain/entities/items/eav';
import {
  CrawlActivity,
  CrawlCache,
  CrawlFailure,
  SynchronizationHistory,
} from './domain/entities/magento';
import { ArticleOrdered, Order, Voucher } from './domain/entities/orders';
import {
  PurchaseOrder,
  Supplier,
  VariantPurchased,
} from './domain/entities/purchases';
import { Address } from './domain/entities/shared';
import { Category, Collection } from './domain/entities/structures';
import { Area, Location, StoragePoint } from './domain/entities/warehouses';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { VoucherModule } from './api/features/orders/voucher/voucher.module';
import { ScheduleModule } from '@nestjs/schedule';
import { Counter } from './domain/entities/finance';
import { CounterModule } from './api/features/finance/counter/counter.module';
import { BullModule } from '@nestjs/bull';
import { SENDING_EMAIL_QUEUE } from './domain/constants';
import { VentesModule } from './api/features/analytics/ventes/ventes.module';
import { Delivery, Expedition, OrderExpedited, Packages } from './domain/entities/logistics';
import { DeliveryModule } from './api/features/logistics/fleet/delivery/delivery.module';
import { DeliveryPointModule } from './api/features/logistics/fleet/delivery-point-management/delivery-point.module';


@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'emailSending',
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    MailerModule.forRoot({
      transport: {
        service: 'gmail',
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
      template: {
        dir: join(__dirname, 'templates'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
    // TypeOrmModule.forRoot(OrmConfig),

    TypeOrmModule.forRoot({
      type: process.env.DATABASE_TYPE as any,
      host: process.env.DATABASE_HOST,
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      port: parseInt(process.env.DATABASE_PORT),
      database: process.env.DATABASE_NAME,
      timezone: 'UTC',
      entities: [
        ProductVariant,
        Order,
        Address,
        Area,
        Location,
        StoragePoint,
        ProductItem,
        Product,
        Category,
        Collection,
        Supplier,
        Service,
        DeliveryService,
        InstallationService,
        WarrantyService,
        ServiceComposition,
        ProductVariantAttributeValues,
        ProductComposition,
        VariantComposition,
        ExtraPackaging,
        Attribute,
        Unit,
        AttributeSet,
        AttributeOption,
        AttributeValue,
        VariantReception,
        MobileUnit,
        StockMovement,
        SupplierReturn,
        CustomerReturn,
        Voucher,
        Inventory,
        Transfert,
        VariantPurchased,
        InternalNeed,
        InventoryState,
        Investigation,
        VariantTransfert,
        ArticleOrdered,
        VariantNeeded,
        OrderProcessing,
        PickingList,
        Reception,
        PurchaseOrder,
        OtherOutput,
        VariantToOutput,
        CrawlActivity,
        CrawlCache,
        CrawlFailure,
        SynchronizationHistory,
        Counter,
        Delivery,
        Expedition,
        Packages,
        OrderExpedited
      ],
      autoLoadEntities: true,
      synchronize: true,
      logging: false,
    }),

    AuthModule,
    AddressModule,
    StoragePointModule,
    AreaModule,
    LocationModule,
    CategoryModule,
    CollectionModule,
    ProductModule,
    ProductVariantModule,
    ProductItemModule,
    UnitModule,
    AttributeModule,
    AttributeSetModule,
    TransfertModule,
    MobileUnitModule,
    PurchaseOrderModule,
    ReceptionModule,
    InventoryModule,
    InvestigationModule,
    InternalNeedModule,
    CustomerReturnModule,
    OrderModule,
    OtherOutputModule,
    MagentoSyncModule,
    WarehouseModule,
    SupplierModule,
    VoucherModule,
    CounterModule,
    VentesModule,
    DeliveryModule,
    DeliveryPointModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
