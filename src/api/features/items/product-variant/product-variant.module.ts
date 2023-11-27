import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Product,
  ProductComposition,
  ProductItem,
  ProductVariant,
  ProductVariantAttributeValues,
  VariantComposition,
} from 'src/domain/entities/items';
import {
  Attribute,
  AttributeOption,
  AttributeSet,
  AttributeValue,
  Unit,
} from 'src/domain/entities/items/eav';

import { AddProductVariantController } from './add-product-variant/add-product-variant.controller';
import { AddProductVariantService } from './add-product-variant/add-product-variant.service';
import { EditProductVariantController } from './edit-product-variant/edit-product-variant.controller';
import { EditProductVariantService } from './edit-product-variant/edit-product-variant.service';
import { DeleteProductVariantsController } from './delete-product-variants/delete-product-variants.controller';
import { DeleteProductVariantsService } from './delete-product-variants/delete-product-variants.service';
import { RestoreProductVariantsController } from './restore-product-variants/restore-product-variants.controller';
import { RestoreProductVariantsService } from './restore-product-variants/restore-product-variants.service';
import { GetProductVariantByIdController } from './get-product-variant-by-id/get-product-variant-by-id.controller';
import { GetProductVariantByIdService } from './get-product-variant-by-id/get-product-variant-by-id.service';
import { GetItemsByProductVariantController } from './get-items-by-product-variant/get-items-by-product-variant.controller';
import { GetItemsByProductVariantService } from './get-items-by-product-variant/get-items-by-product-variant.service';
import { GetProductVariantsController } from './get-product-variants/get-product-variants.controller';
import { GetProductVariantsService } from './get-product-variants/get-product-variants.service';
import { AddVariantForInternalNeedController } from './add-variant-for-internal-need/add-variant-for-internal-need.controller';
import { AddVariantForInternalNeedService } from './add-variant-for-internal-need/add-variant-for-internal-need.service';
import { Category } from 'src/domain/entities/structures';
import {
  CustomAttributeSetService,
  SharedService,
} from 'src/services/utilities';
import {
  ProductVariantService,
  UpdateMagentoDataService,
} from 'src/services/generals';
import { ItemsReferenceService } from 'src/services/references/items';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import { SearchVariantsByKeywordController } from './search-variants-by-keyword/search-variants-by-keyword.controller';
import { SearchVariantsByKeywordService } from './search-variants-by-keyword/search-variants-by-keyword.service';
import { Supplier } from 'src/domain/entities/purchases';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      ProductVariant,
      Product,
      Attribute,
      AttributeSet,
      AttributeOption,
      ProductVariantAttributeValues,
      AttributeValue,
      ProductItem,
      Unit,
      Category,
      Location,
      StoragePoint,
      Area,
      ProductComposition,
      VariantComposition,
      Supplier,
    ]),
  ],
  controllers: [
    AddProductVariantController,
    EditProductVariantController,
    DeleteProductVariantsController,
    RestoreProductVariantsController,
    GetProductVariantByIdController,
    GetItemsByProductVariantController,
    GetProductVariantsController,
    AddVariantForInternalNeedController,
    SearchVariantsByKeywordController,
  ],
  providers: [
    SharedService,
    CustomAttributeSetService,
    ItemsReferenceService,
    UpdateMagentoDataService,

    ProductVariantService,
    AddProductVariantService,
    EditProductVariantService,
    DeleteProductVariantsService,
    RestoreProductVariantsService,
    GetProductVariantByIdService,
    GetItemsByProductVariantService,
    GetProductVariantsService,
    AddVariantForInternalNeedService,
    SearchVariantsByKeywordService,
  ],
})
export class ProductVariantModule {}
