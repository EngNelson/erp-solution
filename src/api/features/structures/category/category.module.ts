import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category, Collection } from 'src/domain/entities/structures';
import { AddCategoryController } from './add-category/add-category.controller';
import { AddCategoryService } from './add-category/add-category.service';
import { EditCategoryController } from './edit-category/edit-category.controller';
import { EditCategoryService } from './edit-category/edit-category.service';
import { DeleteCategoriesController } from './delete-categories/delete-categories.controller';
import { DeleteCategoriesService } from './delete-categories/delete-categories.service';
import { MoveCategoryController } from './move-category/move-category.controller';
import { MoveCategoryService } from './move-category/move-category.service';
import { RestoreCategoriesController } from './restore-categories/restore-categories.controller';
import { RestoreCategoriesService } from './restore-categories/restore-categories.service';
import { DisableCategoriesController } from './disable-categories/disable-categories.controller';
import { DisableCategoriesService } from './disable-categories/disable-categories.service';
import { EnableCategoriesController } from './enable-categories/enable-categories.controller';
import { EnableCategoriesService } from './enable-categories/enable-categories.service';
import { GetCategoryByIdController } from './get-category-by-id/get-category-by-id.controller';
import { GetCategoryByIdService } from './get-category-by-id/get-category-by-id.service';
import { GetCategoriesController } from './get-categories/get-categories.controller';
import { GetCategoriesService } from './get-categories/get-categories.service';
import { GetCategoryProductsController } from './get-category-products/get-category-products.controller';
import { GetCategoryProductsService } from './get-category-products/get-category-products.service';
import {
  Product,
  ProductItem,
  ProductVariant,
  ProductVariantAttributeValues,
} from 'src/domain/entities/items';
import { GetCategoryCollectionsController } from './get-category-collections/get-category-collections.controller';
import { GetCategoryCollectionsService } from './get-category-collections/get-category-collections.service';

import { Attribute, Unit } from 'src/domain/entities/items/eav';
import { SharedService } from 'src/services/utilities';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      Product,
      Collection,
      Attribute,
      Unit,
      ProductVariant,
      ProductItem,
      ProductVariantAttributeValues,
      Location,
      StoragePoint,
      Area,
    ]),
  ],
  controllers: [
    AddCategoryController,
    EditCategoryController,
    DeleteCategoriesController,
    MoveCategoryController,
    RestoreCategoriesController,
    DisableCategoriesController,
    EnableCategoriesController,
    GetCategoryByIdController,
    GetCategoriesController,
    GetCategoryProductsController,
    GetCategoryCollectionsController,
  ],
  providers: [
    SharedService,
    AddCategoryService,
    EditCategoryService,
    DeleteCategoriesService,
    MoveCategoryService,
    RestoreCategoriesService,
    DisableCategoriesService,
    EnableCategoriesService,
    GetCategoryByIdService,
    GetCategoriesService,
    GetCategoryProductsService,
    GetCategoryCollectionsService,
  ],
})
export class CategoryModule {}
