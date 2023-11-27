import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  MobileUnit,
  StockMovement,
  Transfert,
  VariantTransfert,
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
import { AddMobileUnitController } from './add-mobile-unit/add-mobile-unit.controller';
import { AddMobileUnitService } from './add-mobile-unit/add-mobile-unit.service';
import { GetMobileUnitByIdController } from './get-mobile-unit-by-id/get-mobile-unit-by-id.controller';
import { GetMobileUnitByIdService } from './get-mobile-unit-by-id/get-mobile-unit-by-id.service';
import { EditMobileUnitController } from './edit-mobile-unit/edit-mobile-unit.controller';
import { EditMobileUnitService } from './edit-mobile-unit/edit-mobile-unit.service';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import { Supplier } from 'src/domain/entities/purchases';
import { DeleteMobileUnitController } from './delete-mobile-unit/delete-mobile-unit.controller';
import { DeleteMobileUnitService } from './delete-mobile-unit/delete-mobile-unit.service';
import { SharedService } from 'src/services/utilities';
import { MobileUnitReferenceService } from 'src/services/references/flows';
import {
  MobileUnitService,
  ProductVariantService,
  ProductsService,
} from 'src/services/generals';
import { ItemsReferenceService } from 'src/services/references/items';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MobileUnit,
      Transfert,
      VariantTransfert,
      ProductItem,
      Attribute,
      Unit,
      Product,
      ProductVariant,
      ProductItem,
      StoragePoint,
      Area,
      Location,
      Supplier,
      ProductVariantAttributeValues,
      StockMovement,
      AttributeValue,
      AttributeSet,
      AttributeOption,
    ]),
  ],
  controllers: [
    AddMobileUnitController,
    GetMobileUnitByIdController,
    EditMobileUnitController,
    DeleteMobileUnitController,
  ],
  providers: [
    ProductVariantService,
    ProductsService,
    MobileUnitService,
    ItemsReferenceService,

    MobileUnitReferenceService,
    SharedService,
    AddMobileUnitService,
    GetMobileUnitByIdService,
    EditMobileUnitService,
    DeleteMobileUnitService,
  ],
})
export class MobileUnitModule {}
