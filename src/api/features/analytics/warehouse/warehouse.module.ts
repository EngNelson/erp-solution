import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CustomerReturn,
  InternalNeed,
  OtherOutput,
  Reception,
  Transfert,
} from 'src/domain/entities/flows';
import {
  Product,
  ProductItem,
  ProductVariant,
} from 'src/domain/entities/items';
import { Order } from 'src/domain/entities/orders';
import { PurchaseOrder } from 'src/domain/entities/purchases';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import { GetWarehouseResumeController } from './get-warehouse-resume/get-warehouse-resume.controller';
import { GetWarehouseResumeService } from './get-warehouse-resume/get-warehouse-resume.service';
import { GetProfitResumeController } from './get-profit-resume/get-profit-resume.controller';
import { GetProfitResumeService } from './get-profit-resume/get-profit-resume.service';
import { GetCategoriesResumeController } from './get-categories-resume/get-categories-resume.controller';
import { GetCategoriesResumeService } from './get-categories-resume/get-categories-resume.service';
import { GetLocationsByStoragePointService } from '../../warehouses/storage-point/get-locations-by-storage-point/get-locations-by-storage-point.service';
import { Category } from 'src/domain/entities/structures';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StoragePoint,
      ProductItem,
      ProductVariant,
      PurchaseOrder,
      Transfert,
      OtherOutput,
      InternalNeed,
      Order,
      Reception,
      CustomerReturn,
      Area,
      Location,
      Product,
      Category,
    ]),
  ],
  controllers: [
    GetWarehouseResumeController,
    GetProfitResumeController,
    GetCategoriesResumeController,
  ],
  providers: [
    GetWarehouseResumeService,
    GetProfitResumeService,
    GetCategoriesResumeService,
    GetLocationsByStoragePointService,
  ],
})
export class WarehouseModule {}
