import { Module } from '@nestjs/common';
import { GetPickingListsController } from './get-picking-lists/get-picking-lists.controller';
import { GetPickingListsService } from './get-picking-lists/get-picking-lists.service';
import { GetPickingListByIdController } from './get-picking-list-by-id/get-picking-list-by-id.controller';
import { GetPickingListByIdService } from './get-picking-list-by-id/get-picking-list-by-id.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PickingList, Transfert } from 'src/domain/entities/flows';
import {
  Product,
  ProductItem,
  ProductVariant,
} from 'src/domain/entities/items';
import { Attribute, Unit } from 'src/domain/entities/items/eav';
import { ValidatePickingListController } from './validate-picking-lists/validate-picking-lists.controller';
import { ValidatePickingListService } from './validate-picking-lists/validate-picking-lists.service';
import { SharedService } from 'src/services/utilities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PickingList,
      Product,
      ProductVariant,
      ProductItem,
      Attribute,
      Unit,
      Transfert,
    ]),
  ],
  controllers: [
    GetPickingListsController,
    GetPickingListByIdController,
    ValidatePickingListController,
  ],
  providers: [
    SharedService,
    GetPickingListsService,
    GetPickingListByIdService,
    ValidatePickingListService,
  ],
})
export class PickingListModule {}
