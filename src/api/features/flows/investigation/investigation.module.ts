import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Inventory,
  Investigation,
  Reception,
  StockMovement,
  Transfert,
  VariantReception,
} from 'src/domain/entities/flows';
import { GetInvestigationsController } from './get-investigations/get-investigations.controller';
import { GetInvestigationsService } from './get-investigations/get-investigations.service';
import { GetInvestigationByIdController } from './get-investigation-by-id/get-investigation-by-id.controller';
import { GetInvestigationByIdService } from './get-investigation-by-id/get-investigation-by-id.service';
import {
  Product,
  ProductItem,
  ProductVariant,
  ProductVariantAttributeValues,
} from 'src/domain/entities/items';
import { CloseInvestigationController } from './close-investigation/close-investigation.controller';
import { CloseInvestigationService } from './close-investigation/close-investigation.service';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import { PurchaseOrder, Supplier } from 'src/domain/entities/purchases';
import { ReceptionService } from 'src/services/references/flows';
import { SharedService, UserService } from 'src/services/utilities';
import { MobileUnitService } from 'src/services/generals';
import { Attribute, Unit } from 'src/domain/entities/items/eav';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Investigation,
      Inventory,
      ProductItem,
      StockMovement,
      ProductVariant,
      Product,
      Location,
      Area,
      StoragePoint,
      Reception,
      VariantReception,
      Supplier,
      PurchaseOrder,
      Transfert,
      Attribute,
      Unit,
      ProductVariantAttributeValues,
    ]),
  ],
  controllers: [
    GetInvestigationsController,
    GetInvestigationByIdController,
    CloseInvestigationController,
  ],
  providers: [
    ReceptionService,
    SharedService,
    MobileUnitService,
    UserService,

    GetInvestigationsService,
    GetInvestigationByIdService,
    CloseInvestigationService,
  ],
})
export class InvestigationModule {}
