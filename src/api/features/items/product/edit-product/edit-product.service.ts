import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isNullOrWhiteSpace, ISOLang, UserCon } from '@glosuite/shared';
import { ProductItemOutput } from 'src/domain/dto/items';
import {
  Product,
  ProductComposition,
  ProductVariant,
} from 'src/domain/entities/items';
import { AttributeSet } from 'src/domain/entities/items/eav';
import { Category } from 'src/domain/entities/structures';
import { ProductType } from 'src/domain/enums/items';
import { ProductCompositionModel } from 'src/domain/types/catalog/items';
import {
  AttributeSetRepository,
  ProductCompositionRepository,
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import { CategoryRepository } from 'src/repositories/structures';
import { EditProductInput } from './dto';
import { ProductVariantService } from 'src/services/generals';

type ValidationResult = {
  product: Product;
  categories: Category[];
  attributeSet: AttributeSet;
  children: ProductCompositionModel[];
  isCategories: boolean;
  isAttributeSet: boolean;
  isChildren: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class EditProductService {
  constructor(
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(Category)
    private readonly _categoryRepository: CategoryRepository,
    @InjectRepository(AttributeSet)
    private readonly _attributeSetRepository: AttributeSetRepository,
    @InjectRepository(ProductComposition)
    private readonly _productCompositionRepository: ProductCompositionRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    private readonly _productVariantSkuService: ProductVariantService,
  ) {}

  async editProduct(
    input: EditProductInput,
    user: UserCon,
  ): Promise<ProductItemOutput> {
    const result = await this._tryValidation(input, user);

    if (!result) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(input, result);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: EditProductInput,
    result: ValidationResult,
  ): Promise<ProductItemOutput> {
    try {
      const {
        product,
        categories,
        attributeSet,
        children,
        isCategories,
        isAttributeSet,
        isChildren,
        lang,
        user,
      } = result;

      if (input.title) {
        const inputLangs = Object.keys(input.title);
        inputLangs.forEach((l) => {
          product.title[l] = input.title[l];
        });
      }

      if (input.sku && input.sku !== product.sku) {
        const variants = await this._productVariantRepository.find({
          productId: product.id,
        });

        await Promise.all(
          variants.map(async (variant) => {
            variant.sku = await this._productVariantSkuService.updateSKU(
              product.sku,
              input.sku,
              variant,
            );

            await this._productVariantRepository.save(variant);
          }),
        );

        product.sku = input.sku;
      }

      product.productType = input.productType;
      product.canBeSold = input.canBeSold;
      product.canBeRented = input.canBeRented;
      product.canBePackaged = input.canBePackaged;
      product.mustBePackaged = input.mustBePackaged;

      if (isCategories) {
        product.categories = categories;
      }

      if (isAttributeSet) {
        product.attributeSetId = attributeSet.id;
        product.attributeSet = attributeSet;
      }

      const compositionsToUpdate: ProductComposition[] = [];
      if (isChildren) {
        /**
         * Delete all product compositions if exist
         */
        const productCompositionsToDelete: ProductComposition[] = [];
        if (product.children && product.children.length > 0) {
          product.children.map(async (composition) => {
            await this._productCompositionRepository.delete(composition.id);
            productCompositionsToDelete.push(composition);
          });
        }

        await this._productCompositionRepository.save(
          productCompositionsToDelete,
        );

        /**
         * Save new children
         */
        let position = 0;
        children.map((childItem) => {
          const { child, required, defaultQuantity } = childItem;

          const productComposition = new ProductComposition();

          productComposition.child = child;
          productComposition.childId = child.id;

          productComposition.required = required;
          productComposition.defaultQuantity = defaultQuantity;

          productComposition.parentId = product.id;
          productComposition.parent = product;
          productComposition.position = position;

          productComposition.createdBy = user;

          compositionsToUpdate.push(productComposition);

          position++;
        });

        await this._productCompositionRepository.save(compositionsToUpdate);

        product.children = compositionsToUpdate;
      }

      product.updatedBy = user;

      await this._productRepository.save(product);

      return new ProductItemOutput(product, lang);
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${EditProductService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: EditProductInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

      const product = await this._productRepository.findOne(
        { id: input.productId },
        {
          relations: ['categories', 'attributeSet', 'parents', 'children'],
        },
      );
      if (!product) {
        throw new NotFoundException(
          `Product with id '${input.productId}' not found`,
        );
      }

      const categories: Category[] = [];
      let attributeSet: AttributeSet;
      const children: ProductCompositionModel[] = [];

      /**
       * Empecher un produit de se retrouver dans plusieurs categories
       */
      if (input.categoryIds?.length > 1) {
        throw new BadRequestException(
          `a product cannot be found in more than one category`,
        );
      }

      if (input.categoryIds && input.categoryIds.length === 1) {
        const category = await this._categoryRepository.findOne(
          input.categoryIds[0],
        );
        if (!category) {
          throw new NotFoundException(
            `Category with id '${input.categoryIds[0]}' not found`,
          );
        }

        categories.push(category);
      }

      if (!isNullOrWhiteSpace(input.attributeSetId)) {
        attributeSet = await this._attributeSetRepository.findOne(
          input.attributeSetId,
        );
        if (!attributeSet) {
          throw new NotFoundException(
            `AttributeSet with id '${input.attributeSetId}' not found`,
          );
        }
      }

      if (
        (input.productType === ProductType.GROUPED ||
          input.productType === ProductType.BUNDLED) &&
        (!input.children || input.children.length === 0)
      ) {
        throw new BadRequestException(
          `Please provide childrens for ${input.productType} product`,
        );
      }

      if (input.children && input.children.length > 0) {
        if (
          input.productType !== ProductType.GROUPED &&
          input.productType !== ProductType.BUNDLED
        ) {
          throw new BadRequestException(
            `You cannot add children since this parent is not '${ProductType.GROUPED} either ${ProductType.BUNDLED}' product`,
          );
        }

        await Promise.all(
          input.children.map(async (childItem) => {
            const { childId, required, defaultQuantity } = childItem;

            const child = await this._productRepository.findOne({
              id: childId,
            });
            if (!child) {
              throw new NotFoundException(
                `Some children product provided are not found`,
              );
            }

            if (child.productType !== ProductType.SIMPLE) {
              throw new BadRequestException(
                `You cannot add a product that is not '${ProductType.SIMPLE}' as a child of a ${ProductType.GROUPED} or ${ProductType.BUNDLED} product`,
              );
            }

            const productCompositionItem: ProductCompositionModel = {
              child,
              required,
              defaultQuantity,
            };
            children.push(productCompositionItem);
          }),
        );
      }

      return {
        product,
        categories,
        attributeSet,
        children,
        isCategories: !!categories,
        isAttributeSet: !!attributeSet,
        isChildren: children.length > 0,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${EditProductService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }
}
