import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  InternalNeed,
  OtherOutput,
  PickingList,
  VariantNeeded,
  VariantToOutput,
} from 'src/domain/entities/flows';
import {
  Product,
  ProductItem,
  ProductVariant,
  ProductVariantAttributeValues,
} from 'src/domain/entities/items';
import { Attribute, Unit } from 'src/domain/entities/items/eav';
import { AddInternalNeedController } from './add-internal-need/add-internal-need.controller';
import { AddInternalNeedService } from './add-internal-need/add-internal-need.service';
import { SendInternalNeedController } from './send-internal-need/send-internal-need.controller';
import { SendInternalNeedService } from './send-internal-need/send-internal-need.service';
import { GetInternalNeedsController } from './get-internal-needs/get-internal-needs.controller';
import { GetInternalNeedsService } from './get-internal-needs/get-internal-needs.service';
import { GetInternalNeedByIdController } from './get-internal-need-by-id/get-internal-need-by-id.controller';
import { GetInternalNeedByIdService } from './get-internal-need-by-id/get-internal-need-by-id.service';
import {
  PurchaseOrder,
  Supplier,
  VariantPurchased,
} from 'src/domain/entities/purchases';
import { EditSendedInternalNeedController } from './edit-sended-internal-need/edit-sended-internal-need.controller';
import { EditSendedInternalNeedService } from './edit-sended-internal-need/edit-sended-internal-need.service';
import { RejectInternalNeedController } from './reject-internal-need/reject-internal-need.controller';
import { RejectInternalNeedService } from './reject-internal-need/reject-internal-need.service';
import { ValidateInternalNeedController } from './validate-internal-need/validate-internal-need.controller';
import { ValidateInternalNeedService } from './validate-internal-need/validate-internal-need.service';

import { SharedService, UserService } from 'src/services/utilities';
import { SendingEmailService } from 'src/services/email';
import {
  InternalNeedReferenceService,
  PickingListReferenceService,
} from 'src/services/references/flows';
import { PurchaseOrderReferenceService } from 'src/services/references/purchases';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import { OtherOutputService } from 'src/services/generals';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      InternalNeed,
      VariantNeeded,
      ProductVariant,
      Attribute,
      Unit,
      ProductItem,
      Product,
      PurchaseOrder,
      PickingList,
      VariantPurchased,
      ProductVariantAttributeValues,
      Location,
      StoragePoint,
      Area,
      OtherOutput,
      VariantToOutput,
      Supplier,
    ]),
  ],
  controllers: [
    AddInternalNeedController,
    SendInternalNeedController,
    GetInternalNeedsController,
    GetInternalNeedByIdController,
    EditSendedInternalNeedController,
    RejectInternalNeedController,
    ValidateInternalNeedController,
  ],
  providers: [
    InternalNeedReferenceService,
    SharedService,
    SendingEmailService,
    PickingListReferenceService,
    PurchaseOrderReferenceService,
    OtherOutputService,
    UserService,

    AddInternalNeedService,
    SendInternalNeedService,
    GetInternalNeedsService,
    GetInternalNeedByIdService,
    EditSendedInternalNeedService,
    RejectInternalNeedService,
    ValidateInternalNeedService,
  ],
})
export class InternalNeedModule {}
