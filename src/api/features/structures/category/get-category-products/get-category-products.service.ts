import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import {
  GetProductsOptionsInput,
  ProductItemOutput,
} from 'src/domain/dto/items';
import { Product } from 'src/domain/entities/items';
import { Category } from 'src/domain/entities/structures';
import { ProductType } from 'src/domain/enums/items';
import { ProductRepository } from 'src/repositories/items';
import {
  CategoryRepository,
  CategoryTreeRepository,
} from 'src/repositories/structures';
import { GetCategoryProductsInput, GetCategoryProductsOutput } from './dto';

type ValidationResult = {
  category: Category;
  lang?: ISOLang;
  productType?: ProductType;
  isProductType: boolean;
};

@Injectable()
export class GetCategoryProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(Category)
    private readonly _categoryRepository: CategoryRepository,
    @InjectRepository(Category)
    private readonly _categoryTreeRepository: CategoryTreeRepository,
  ) {}

  async getProductsByCategory(
    input: GetCategoryProductsInput,
    user: UserCon,
    options: GetProductsOptionsInput,
  ): Promise<GetCategoryProductsOutput> {
    const validationResult = await this._tryValidation(input, options, user);

    if (!validationResult) {
      throw new HttpException(
        'inputs validation error',
        HttpStatus.BAD_REQUEST,
      );
    }

    const executionResult: GetCategoryProductsOutput = await this._tryExecution(
      validationResult,
    );

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
  ): Promise<GetCategoryProductsOutput> {
    try {
      const { category, lang, productType, isProductType } = result;

      const subCategories = await this._categoryTreeRepository.findDescendants(
        category,
      );

      const allProducts: Product[] = [];
      await Promise.all(
        subCategories.map(async (subCat) => {
          subCat = await this._categoryRepository.findOne({
            where: { id: subCat.id },
            relations: ['products'],
          });

          const products = isProductType
            ? subCat?.products?.filter(
                (product) => product.productType === productType,
              )
            : subCat?.products;

          await Promise.all(
            products.map(async (product) => {
              if (
                allProducts.filter(
                  (productPushed) => productPushed.id === product.id,
                ).length === 0
              ) {
                const productToPush = await this._productRepository.findOne({
                  where: { id: product.id },
                  relations: ['categories', 'children', 'attributeSet'],
                });
                allProducts.push(productToPush);
              }
            }),
          );
        }),
      );

      return new GetCategoryProductsOutput(
        allProducts.map((product) => new ProductItemOutput(product, lang)),
        category.products.length,
      );
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async _tryValidation(
    input: GetCategoryProductsInput,
    options: GetProductsOptionsInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const { categoryId } = input;
      const { productType } = options;

      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

      const category = await this._categoryRepository.findOne({
        where: { id: categoryId },
        relations: ['products'],
      });
      if (!category) {
        throw new NotFoundException(
          `Category with id '${categoryId}' not found`,
        );
      }

      return { category, lang, productType, isProductType: !!productType };
    } catch (error) {
      throw new BadRequestException(
        `${GetCategoryProductsService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
