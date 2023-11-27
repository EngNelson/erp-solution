import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  OtherOutput,
  Reception,
  StockMovement,
  Transfert,
  VariantToOutput,
} from 'src/domain/entities/flows';
import {
  Product,
  ProductItem,
  ProductVariant,
  ProductVariantAttributeValues,
} from 'src/domain/entities/items';
import { Attribute, Unit } from 'src/domain/entities/items/eav';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import {
  MobileUnitService,
  OtherOutputService,
  ReportsService,
  UpdateMagentoDataService,
} from 'src/services/generals';
import { SharedService, UserService } from 'src/services/utilities';
import { AddOtherOutputController } from './add-other-output/add-other-output.controller';
import { AddOtherOutputService } from './add-other-output/add-other-output.service';
import { ConfirmOtherOutputController } from './confirm-other-output/confirm-other-output.controller';
import { ConfirmOtherOutputService } from './confirm-other-output/confirm-other-output.service';
import { GetOtherOutputsController } from './get-other-outputs/get-other-outputs.controller';
import { GetOtherOutputsService } from './get-other-outputs/get-other-outputs.service';
import { GetOtherOutputByIdController } from './get-other-output-by-id/get-other-output-by-id.controller';
import { GetOtherOutputByIdService } from './get-other-output-by-id/get-other-output-by-id.service';
import { PurchaseOrder, Supplier } from 'src/domain/entities/purchases';
import { ValidateOtherOutputController } from './validate-other-output/validate-other-output.controller';
import { ValidateOtherOutputService } from './validate-other-output/validate-other-output.service';
import { CancelOtherOutputController } from './cancel-other-output/cancel-other-output.controller';
import { CancelOtherOutputService } from './cancel-other-output/cancel-other-output.service';
import { ReceptionService } from 'src/services/references/flows';
import { GetOtherOutputsVariantsController } from './get-other-outputs-variants/get-other-outputs-variants.controller';
import { GetOtherOutputsVariantsService } from './get-other-outputs-variants/get-other-outputs-variants.service';
import { Category } from 'src/domain/entities/structures';
import { CreateOtherOutputController } from './create-other-output/create-other-output.controller';
import { CreateOtherOutputService } from './create-other-output/create-other-output.service';
import { HttpModule } from '@nestjs/axios';
import { EditOtherOutputController } from './edit-other-output/edit-other-output.controller';
import { EditOtherOutputService } from './edit-other-output/edit-other-output.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      OtherOutput,
      VariantToOutput,
      StoragePoint,
      ProductVariant,
      Attribute,
      Unit,
      ProductVariantAttributeValues,
      ProductItem,
      Product,
      Location,
      Area,
      StockMovement,
      Supplier,
      Reception,
      Category,
      PurchaseOrder,
      Transfert,
    ]),
  ],
  controllers: [
    AddOtherOutputController,
    ConfirmOtherOutputController,
    GetOtherOutputsController,
    GetOtherOutputByIdController,
    ValidateOtherOutputController,
    CancelOtherOutputController,
    GetOtherOutputsVariantsController,
    CreateOtherOutputController,
    EditOtherOutputController,
  ],
  providers: [
    OtherOutputService,
    SharedService,
    UserService,
    ReceptionService,
    ReportsService,
    UpdateMagentoDataService,
    MobileUnitService,

    AddOtherOutputService,
    ConfirmOtherOutputService,
    GetOtherOutputsService,
    GetOtherOutputByIdService,
    ValidateOtherOutputService,
    CancelOtherOutputService,
    GetOtherOutputsVariantsService,
    CreateOtherOutputService,
    EditOtherOutputService,
  ],
})
export class OtherOutputModule {}
