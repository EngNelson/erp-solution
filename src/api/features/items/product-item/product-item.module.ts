import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Inventory,
  Reception,
  StockMovement,
  Transfert,
  VariantReception,
} from 'src/domain/entities/flows';
import {
  Product,
  ProductItem,
  ProductVariant,
  ProductVariantAttributeValues,
} from 'src/domain/entities/items';
import { Area, Location } from 'src/domain/entities/warehouses';
import { GetProductItemByBarcodeController } from './get-product-item-by-barcode/get-product-item-by-barcode.controller';
import { GetProductItemByBarcodeService } from './get-product-item-by-barcode/get-product-item-by-barcode.service';
import { GetProductItemStockMovementsController } from './get-product-item-stock-movements/get-product-item-stock-movements.controller';
import { GetProductItemStockMovementsService } from './get-product-item-stock-movements/get-product-item-stock-movements.service';
import { EditItemsPurchaseCostController } from './edit-items-purchase-cost/edit-items-purchase-cost.controller';
import { EditItemsPurchaseCostService } from './edit-items-purchase-cost/edit-items-purchase-cost.service';
import { ReceptionService } from 'src/services/references/flows';
import { PurchaseOrder } from 'src/domain/entities/purchases';
import { SharedService, UserService } from 'src/services/utilities';
import { MobileUnitService } from 'src/services/generals';
import { Attribute, Unit } from 'src/domain/entities/items/eav';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductItem,
      StockMovement,
      Location,
      Reception,
      Inventory,
      Transfert,
      VariantReception,
      PurchaseOrder,
      ProductVariant,
      Attribute,
      Unit,
      ProductVariantAttributeValues,
      Product,
      Area,
    ]),
  ],
  controllers: [
    GetProductItemByBarcodeController,
    GetProductItemStockMovementsController,
    EditItemsPurchaseCostController,
  ],
  providers: [
    ReceptionService,
    SharedService,
    MobileUnitService,
    UserService,

    GetProductItemByBarcodeService,
    GetProductItemStockMovementsService,
    EditItemsPurchaseCostService,
  ],
})
export class ProductItemModule {}
