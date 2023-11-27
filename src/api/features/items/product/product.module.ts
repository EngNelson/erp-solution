import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Product,
  ProductComposition,
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
import { Category } from 'src/domain/entities/structures';
import { AddProductController } from './add-product/add-product.controller';
import { AddProductService } from './add-product/add-product.service';
import { EditProductController } from './edit-product/edit-product.controller';
import { EditProductService } from './edit-product/edit-product.service';
import { DeleteProductsController } from './delete-products/delete-products.controller';
import { DeleteProductsService } from './delete-products/delete-products.service';
import { GetProductByIdController } from './get-product-by-id/get-product-by-id.controller';
import { GetProductByIdService } from './get-product-by-id/get-product-by-id.service';
import { RestoreProductsController } from './restore-products/restore-products.controller';
import { RestoreProductsService } from './restore-products/restore-products.service';
import { GetProductVariantsByProductController } from './get-product-variants-by-product/get-product-variants-by-product.controller';
import { GetProductVariantsByProductService } from './get-product-variants-by-product/get-product-variants-by-product.service';
import { GetAllProductsController } from './get-all-products/get-all-products.controller';
import { GetAllProductsService } from './get-all-products/get-all-products.service';
import { ProductVariantService } from 'src/services/generals';
import { SharedService } from 'src/services/utilities';
import { ItemsReferenceService } from 'src/services/references/items';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import { SearchProductsByKeywordController } from './search-products-by-keyword/search-products-by-keyword.controller';
import { SearchProductsByKeywordService } from './search-products-by-keyword/search-products-by-keyword.service';
import { Supplier } from 'src/domain/entities/purchases';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductItem,
      ProductVariant,
      Category,
      AttributeSet,
      Attribute,
      ProductComposition,
      Unit,
      ProductVariantAttributeValues,
      Location,
      StoragePoint,
      Area,
      Supplier,
      AttributeValue,
      AttributeOption,
    ]),
  ],
  controllers: [
    AddProductController,
    EditProductController,
    DeleteProductsController,
    GetProductByIdController,
    RestoreProductsController,
    GetProductVariantsByProductController,
    GetAllProductsController,
    SearchProductsByKeywordController,
  ],
  providers: [
    ProductVariantService,
    SharedService,
    ItemsReferenceService,

    AddProductService,
    EditProductService,
    DeleteProductsService,
    GetProductByIdService,
    RestoreProductsService,
    GetProductVariantsByProductService,
    GetAllProductsService,
    SearchProductsByKeywordService,
  ],
})
export class ProductModule {}
