import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DEFAULT_PAGE_INDEX,
  DEFAULT_PAGE_SIZE,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { ProductVariantItemOutput } from 'src/domain/dto/items';
import { Product, ProductVariant } from 'src/domain/entities/items';
import { Attribute } from 'src/domain/entities/items/eav';
import {
  ProductVariantItemDetails,
  VariantAttributeValueModel,
} from 'src/domain/types/catalog/items';
import {
  AttributeRepository,
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import { SharedService } from 'src/services/utilities';
import {
  GetProductVariantsByProductInput,
  GetProductVariantsByProductOutput,
} from './dto';

type ValidationResult = {
  product: Product;
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
};

@Injectable()
export class GetProductVariantsByProductService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(Attribute)
    private readonly _attributeRepository: AttributeRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async getProductVariantsByProduct(
    input: GetProductVariantsByProductInput,
    user: UserCon,
  ): Promise<GetProductVariantsByProductOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException(
        'inputs validation error',
        HttpStatus.BAD_REQUEST,
      );
    }

    const executionResult: GetProductVariantsByProductOutput =
      await this._tryExecution(validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    result: ValidationResult,
  ): Promise<GetProductVariantsByProductOutput> {
    try {
      const { product, pageIndex, pageSize, lang } = result;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const variants = await this._productVariantRepository.find({
        where: { productId: product.id },
        relations: ['attributeValues'],
        take,
        skip,
      });

      const allVariantsByProduct: ProductVariantItemDetails[] = [];

      await Promise.all(
        variants.map(async (variant) => {
          const variantAttributeValues: VariantAttributeValueModel<any>[] = [];

          variant.attributeValues?.map(async (attributeValue) => {
            const value = attributeValue.value;

            const attribute = await this._attributeRepository.findOne(
              attributeValue.attributeId,
              { relations: ['units'] },
            );

            const variantAttributeValue: VariantAttributeValueModel<any> = {
              attribute,
              value,
            };

            variantAttributeValues.push(variantAttributeValue);
          });

          const variantItemOutput =
            await this._sharedService.buildVariantDetailsOutput(variant);

          allVariantsByProduct.push(variantItemOutput);
        }),
      );

      const allVariants = await this._productVariantRepository.findAndCount({
        productId: product.id,
      });

      return new GetProductVariantsByProductOutput(
        allVariantsByProduct.map(
          (variant) => new ProductVariantItemOutput(variant, lang),
        ),
        allVariants[1],
        pageIndex,
        pageSize,
      );
    } catch (error) {
      throw new BadRequestException(
        `${GetProductVariantsByProductService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: GetProductVariantsByProductInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const { productId, pagination } = input;

      pagination.pageIndex = pagination.pageIndex
        ? parseInt(pagination.pageIndex.toString())
        : 1;
      pagination.pageSize = pagination.pageSize
        ? parseInt(pagination.pageSize.toString())
        : 25;

      pagination.lang = pagination.lang
        ? pagination.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      if (Number.isNaN(pagination.pageIndex) || pagination.pageIndex <= 0) {
        throw new HttpException(
          `Invalid fields: pageIndex ${pagination.pageIndex}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (Number.isNaN(pagination.pageSize) || pagination?.pageSize < 0) {
        throw new HttpException(
          `Invalid fields: pageSize ${pagination.pageSize}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!ISOLang[pagination.lang.toUpperCase()]) {
        throw new HttpException(
          `Invalid language input: ${pagination.lang} is not supported`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const product = await this._productRepository.findOne(productId, {
        relations: ['categories'],
      });
      if (!product) {
        throw new NotFoundException(`Product with id '${productId}' not found`);
      }

      return { product, ...pagination };
    } catch (error) {
      throw new BadRequestException(
        `${GetProductVariantsByProductService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
