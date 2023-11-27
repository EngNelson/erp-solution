import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Product,
  ProductItem,
  ProductVariant,
} from 'src/domain/entities/items';
import { ProductType } from 'src/domain/enums/items';
import {
  ProductItemRepository,
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import { SharedService } from 'src/services/utilities';

@Injectable()
export class ItemsReferenceService {
  constructor(
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async generateProductReference(productType: ProductType): Promise<string> {
    try {
      const [products, count] = await this._productRepository.findAndCount({
        where: { productType },
        withDeleted: true,
      });
      const suffix = await this._sharedService.generateSuffix(count + 1, 6);

      const prefix = productType.substring(0, 4);

      return `${prefix}-${suffix}`;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured while generating reference` + error.message,
      );
    }
  }

  async generateVariantReference(): Promise<string> {
    try {
      const [variants, count] =
        await this._productVariantRepository.findAndCount();
      const suffix = await this._sharedService.generateSuffix(count + 1, 8);

      return `VAR-${suffix}`;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured while generating reference` + error.message,
      );
    }
  }

  async generateItemReference(): Promise<string> {
    try {
      const [items, count] = await this._productItemRepository.findAndCount();
      const suffix = await this._sharedService.generateSuffix(count + 1, 10);

      return `ITEM-${suffix}`;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured while generating reference` + error.message,
      );
    }
  }
}
