import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DEFAULT_PAGE_INDEX,
  DEFAULT_PAGE_SIZE,
  ISOLang,
  PaginationInput,
  UserCon,
} from '@glosuite/shared';
import { ProductItemWithAverageCostOutput } from 'src/domain/dto/items';
import {
  Product,
  ProductComposition,
  ProductItem,
} from 'src/domain/entities/items';
import { GetProductsItemOutputModel } from 'src/domain/interfaces/items';
import {
  ProductCompositionRepository,
  ProductItemRepository,
  ProductRepository,
} from 'src/repositories/items';
import { GetAllProductsInput, GetAllProductsOutput } from './dto';

type ValidationResult = {
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
};

@Injectable()
export class GetAllProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(ProductComposition)
    private readonly _productCompositionRepository: ProductCompositionRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
  ) {}

  async getAllProducts(
    input: GetAllProductsInput,
    user: UserCon,
  ): Promise<GetAllProductsOutput> {
    const { pagination } = input;
    const validationResult = await this._tryValidation(pagination, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    result: ValidationResult,
  ): Promise<GetAllProductsOutput> {
    try {
      const { pageIndex, pageSize, lang } = result;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const products = await this._productRepository.find({
        relations: [
          'categories',
          'attributeSet',
          'children',
          'productVariants',
        ],
        order: { createdAt: 'DESC' },
        skip,
        take,
      });

      const [allProducts, count] = await this._productRepository.findAndCount();

      /**
       * Build the output
       */
      await Promise.all(
        products.map(async (product) => {
          await Promise.all(
            product?.children?.map(async (composition) => {
              composition.child = await this._productRepository.findOne(
                composition.childId,
              );

              return composition;
            }),
          );

          return product;
        }),
      );

      const productsOutput: GetProductsItemOutputModel[] = [];

      await Promise.all(
        products.map(async (product) => {
          const productIemCosts: number[] = [];

          await Promise.all(
            product.productVariants?.map(async (variant) => {
              const variantCosts: number[] = [];

              const items = await this._productItemRepository.find({
                productVariantId: variant.id,
              });

              items.map((item) => variantCosts.push(item.purchaseCost));

              productIemCosts.push(...variantCosts);
            }),
          );

          const averageCost =
            productIemCosts.reduce((sum, current) => sum + current, 0) /
            productIemCosts.length;

          const productModel: GetProductsItemOutputModel = {
            product,
            averageCost,
          };

          productsOutput.push(productModel);
        }),
      );

      return new GetAllProductsOutput(
        productsOutput.map(
          (productModel) =>
            new ProductItemWithAverageCostOutput(productModel, lang),
        ),
        count,
        pageIndex,
        pageSize,
      );
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetAllProductsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    pagination: PaginationInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      pagination.pageIndex = pagination.pageIndex
        ? parseInt(pagination.pageIndex.toString())
        : DEFAULT_PAGE_INDEX;
      pagination.pageSize = pagination.pageSize
        ? parseInt(pagination.pageSize.toString())
        : DEFAULT_PAGE_SIZE;

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

      return { ...pagination };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetAllProductsService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
