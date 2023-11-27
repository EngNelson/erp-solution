import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DEFAULT_PRODUCT_QUANTITY,
  isNullOrWhiteSpace,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { Product, ProductComposition } from 'src/domain/entities/items';
import { AttributeSet } from 'src/domain/entities/items/eav';
import { Category } from 'src/domain/entities/structures';
import { ProductType } from 'src/domain/enums/items';
import {
  AttributeSetRepository,
  ProductCompositionRepository,
  ProductRepository,
} from 'src/repositories/items';
import { CategoryRepository } from 'src/repositories/structures';
import { AddProductInput } from './dto';
import { ProductItemOutput } from 'src/domain/dto/items';
import { ProductCompositionModel } from 'src/domain/types/catalog/items';
import { ItemsReferenceService } from 'src/services/references/items';

type ValidationResult = {
  categories: Category[];
  attributeSet: AttributeSet;
  children: ProductCompositionModel[];
  isAttributeSet: boolean;
  isChildren: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class AddProductService {
  constructor(
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(Category)
    private readonly _categoryRepository: CategoryRepository,
    @InjectRepository(AttributeSet)
    private readonly _attributeSetRepository: AttributeSetRepository,
    @InjectRepository(ProductComposition)
    private readonly _productCompositionRepository: ProductCompositionRepository,
    private readonly _itemsReferenceService: ItemsReferenceService,
  ) {}

  async addProduct(
    input: AddProductInput,
    user: UserCon,
  ): Promise<ProductItemOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(input, validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: AddProductInput,
    result: ValidationResult,
  ): Promise<ProductItemOutput> {
    const product = new Product();

    try {
      const {
        categories,
        attributeSet,
        children,
        isAttributeSet,
        isChildren,
        lang,
        user,
      } = result;

      product.reference =
        await this._itemsReferenceService.generateProductReference(
          input.productType,
        );
      product.sku = input.sku;
      product.title = input.title;
      product.productType = input.productType;

      if (isAttributeSet) {
        product.attributeSetId = attributeSet.id;
        product.attributeSet = attributeSet;
      }

      product.canBeSold = input.canBeSold;
      product.canBeRented = input.canBeRented;
      product.canBePackaged = input.canBePackaged;
      product.mustBePackaged = input.mustBePackaged;
      product.createdBy = user;

      product.categories = categories;

      if (input.productType === ProductType.SIMPLE) {
        product.quantity = DEFAULT_PRODUCT_QUANTITY;
      }

      await this._productRepository.save(product);

      const compositionsToAdd: ProductComposition[] = [];

      if (isChildren) {
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

          compositionsToAdd.push(productComposition);

          position++;
        });

        await this._productCompositionRepository.save(compositionsToAdd);

        product.children = compositionsToAdd;
      }

      await this._productRepository.save(product);

      return new ProductItemOutput(product, lang);
    } catch (error) {
      console.log(error);

      if (product?.id) {
        await this._productRepository.delete(product.id);
      }
      throw new ConflictException(
        `${AddProductService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: AddProductInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      /**
       * Empecher un produit de se retrouver dans plusieurs categories
       */
      if (input.categoryIds.length > 1) {
        throw new BadRequestException(
          `A product cannot be found in more than one category`,
        );
      }

      const category = await this._categoryRepository.findOne(
        input.categoryIds[0],
      );
      if (!category) {
        throw new NotFoundException(
          `Category with id '${input.categoryIds[0]}' not found`,
        );
      }

      /**
       * Attribute set is required for SIMPLE product
       */
      if (
        isNullOrWhiteSpace(input.attributeSetId) &&
        input.productType === ProductType.SIMPLE
      ) {
        throw new BadRequestException(
          `Attribute set is required for ${ProductType.SIMPLE} product type`,
        );
      }

      let attributeSet: AttributeSet;
      if (input.attributeSetId && !isNullOrWhiteSpace(input.attributeSetId)) {
        attributeSet = await this._attributeSetRepository.findOne(
          input.attributeSetId,
        );
        if (!attributeSet) {
          throw new NotFoundException(
            `Attributeset with id '${input.attributeSetId}' not found`,
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

      const categories: Category[] = [];
      const children: ProductCompositionModel[] = [];

      categories.push(category);

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
        categories,
        attributeSet,
        children,
        isAttributeSet: !!attributeSet,
        isChildren: children.length > 0,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${AddProductService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
