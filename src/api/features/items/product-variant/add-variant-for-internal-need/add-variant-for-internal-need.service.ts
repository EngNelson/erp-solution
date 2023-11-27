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
  AttributeType,
  DEFAULT_PRODUCT_QUANTITY,
  getLangOrFirstAvailableValue,
  isAttributeValueType,
  isNullOrWhiteSpace,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { ProductVariantItemOutput } from 'src/domain/dto/items';
import {
  Product,
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
import { ProductType, ValueType } from 'src/domain/enums/items';
import { AttributeOptionModel } from 'src/domain/types/catalog/eav';
import { VariantAttributeValueModel } from 'src/domain/types/catalog/items';
import {
  AttributeOptionRepository,
  AttributeRepository,
  AttributeSetRepository,
  AttributeValueRepository,
  ProductRepository,
  ProductVariantAttributeValuesRepository,
  ProductVariantRepository,
  UnitRepository,
} from 'src/repositories/items';
import { CategoryRepository } from 'src/repositories/structures';
import { AddVariantForInternalNeedInput } from './dto';
import { ProductVariantService } from 'src/services/generals';
import {
  CustomAttributeSetService,
  SharedService,
} from 'src/services/utilities';
import { ItemsReferenceService } from 'src/services/references/items';

type ValidationResult = {
  attributeSetOptionValues: AttributeOptionModel[];
  attributeValues: VariantAttributeValueModel<any>[];
  categories: Category[];
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class AddVariantForInternalNeedService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(Attribute)
    private readonly _attributeRepository: AttributeRepository,
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
    @InjectRepository(AttributeSet)
    private readonly _attributeSetRepository: AttributeSetRepository,
    @InjectRepository(AttributeOption)
    private readonly _attributeOptionRepository: AttributeOptionRepository,
    @InjectRepository(Category)
    private readonly _categoryRepository: CategoryRepository,
    @InjectRepository(AttributeValue)
    private readonly _attributeValueRepository: AttributeValueRepository,
    @InjectRepository(ProductVariantAttributeValues)
    private readonly _productVariantAttrValuesRepository: ProductVariantAttributeValuesRepository<any>,
    private readonly _itemsReferenceService: ItemsReferenceService,
    private readonly _productVariantSkuService: ProductVariantService,
    private readonly _sharedService: SharedService,
    private readonly _customAttributeSetService: CustomAttributeSetService,
  ) {}

  async addVariantForInternalNeed(
    input: AddVariantForInternalNeedInput,
    user: UserCon,
  ): Promise<ProductVariantItemOutput> {
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
    input: AddVariantForInternalNeedInput,
    result: ValidationResult,
  ): Promise<ProductVariantItemOutput> {
    let attributeSet: AttributeSet;
    let product: Product;
    const variant = new ProductVariant();

    try {
      const {
        attributeSetOptionValues,
        attributeValues,
        categories,
        lang,
        user,
      } = result;

      /**
       * Create attributeSet
       * 1. Is an attributeSet with attribute provided exist ?
       */

      const title = `${getLangOrFirstAvailableValue(
        categories[0].title,
        lang,
      )} custom attribute set`;

      const isAttributeSetExist =
        await this._customAttributeSetService.isAttributeSetExist(
          attributeSetOptionValues,
          title,
        );

      /**
       * If attributeSet exist
       */
      if (isAttributeSetExist.attributeSet) {
        attributeSet = isAttributeSetExist.attributeSet;
      } else {
        /**
         * Else create new one
         */
        attributeSet = new AttributeSet();

        attributeSet.title = title;
        attributeSet.createdBy = user;

        await this._attributeSetRepository.save(attributeSet);

        /**
         * Save attribute options
         */
        const optionsToAdd: AttributeOption[] = [];

        attributeSetOptionValues.map((attributeOption) => {
          const attributeOptionToAdd = new AttributeOption();

          attributeOptionToAdd.attribute = attributeOption.attribute;
          attributeOptionToAdd.attributeId = attributeOption.attribute.id;

          attributeOptionToAdd.required = attributeOption.required;
          attributeOptionToAdd.attributeSet = attributeSet;
          attributeOptionToAdd.attributeSetId = attributeSet.id;

          attributeOptionToAdd.createdBy = user;

          optionsToAdd.push(attributeOptionToAdd);
        });

        await this._attributeOptionRepository.save(optionsToAdd);

        attributeSet.options = optionsToAdd;

        await this._attributeSetRepository.save(attributeSet);
      }

      /**
       * Create product
       */

      /**
       * If product already exist (sku)
       */
      product = await this._productRepository.findOne(
        { sku: input.sku },
        { relations: ['categories'] },
      );

      if (!product) {
        /**
         * Create a new product
         */
        product = new Product();

        product.reference =
          await this._itemsReferenceService.generateProductReference(
            ProductType.SIMPLE,
          );
        product.sku = input.sku;
        product.title = input.title;
        product.productType = ProductType.SIMPLE;
        product.categories = categories;
        product.attributeSet = attributeSet;
        product.attributeSetId = attributeSet.id;
        product.quantity = DEFAULT_PRODUCT_QUANTITY;
        product.createdBy = user;

        await this._productRepository.save(product);
      }

      /**
       * Create variant
       */
      variant.reference =
        await this._itemsReferenceService.generateVariantReference();
      variant.title = product.title;
      variant.salePrice = input.salePrice;
      variant.quantity = DEFAULT_PRODUCT_QUANTITY;
      variant.product = product;
      variant.productId = product.id;
      variant.sku = await this._productVariantSkuService.generateSKU(
        product,
        attributeValues,
      );
      variant.createdBy = user;

      /**
       * Calculate stock value
       */

      await this._productVariantRepository.save(variant);

      /**
       * Add variant attribute values
       */
      const attributeValuesToAdd: ProductVariantAttributeValues<any>[] = [];

      attributeValues.map((attributeValue) => {
        const variantAttributeValue = new ProductVariantAttributeValues<any>();

        variantAttributeValue.value = attributeValue.value;
        variantAttributeValue.attributeId = attributeValue.attribute.id;
        variantAttributeValue.attribute = attributeValue.attribute;
        variantAttributeValue.variantId = variant.id;
        variantAttributeValue.productVariant = variant;

        if (attributeValue.unit) {
          variantAttributeValue.unitId = attributeValue.unit.id;
          variantAttributeValue.unit = attributeValue.unit;
        }

        variantAttributeValue.createdBy = user;

        attributeValuesToAdd.push(variantAttributeValue);
      });

      await this._productVariantAttrValuesRepository.save(attributeValuesToAdd);

      attributeValues.map((attributeValue) => {
        const { attribute, value, unit } = attributeValue;

        attributeValue.unit = unit ? unit : attribute.units[0];

        return attributeValue;
      });

      // Build the output
      const variantDetails =
        await this._sharedService.buildVariantDetailsOutput(variant);

      return new ProductVariantItemOutput(variantDetails, lang);
    } catch (error) {
      if (attributeSet.id) {
        await this._attributeSetRepository.delete(attributeSet.id);
      }

      if (product.id) {
        await this._productRepository.delete(product.id);
      }

      if (variant.id) {
        await this._productVariantRepository.delete(variant.id);
      }

      throw new ConflictException(
        `${AddVariantForInternalNeedService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: AddVariantForInternalNeedInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const attributeSetOptionValues: AttributeOptionModel[] = [];
      const attributeValues: VariantAttributeValueModel<any>[] = [];

      await Promise.all(
        input.attributeValues.map(async (attributeValue) => {
          const { attributeId, value, unitId } = attributeValue;

          const attribute = await this._attributeRepository.findOne(
            attributeId,
            { relations: ['units', 'definedAttributeValues'] },
          );
          if (!attribute) {
            throw new NotFoundException(
              `Attributes with id ${attributeId} is not found`,
            );
          }

          attributeSetOptionValues.push({ attribute, required: true });

          /**
           * Attribute values validation
           */

          if (isNullOrWhiteSpace(unitId) && attribute.units.length > 1) {
            throw new BadRequestException(
              `Specify the unit for which the value should be recorded for "${getLangOrFirstAvailableValue(
                attribute.name,
                lang,
              )}"`,
            );
          }

          let unit: Unit;
          if (!isNullOrWhiteSpace(unitId)) {
            unit = await this._unitRepository.findOneOrFail(unitId);
          }

          /**
           * Attribute value validation according to attribute type
           */
          if (attribute.valueType !== ValueType.MULTIPLE_SELECT) {
            if (
              attribute.type === AttributeType.STRING &&
              typeof value !== 'string'
            ) {
              throw new BadRequestException(
                `The attribute value for '${getLangOrFirstAvailableValue(
                  attribute.name,
                  lang,
                )}' must be a ${AttributeType.STRING}`,
              );
            }

            if (
              attribute.type === AttributeType.NUMBER &&
              typeof value !== 'number'
            ) {
              throw new BadRequestException(
                `The attribute value for '${getLangOrFirstAvailableValue(
                  attribute.name,
                  lang,
                )}' must be a ${AttributeType.NUMBER}`,
              );
            }

            if (
              attribute.type === AttributeType.BOOLEAN &&
              typeof value !== 'boolean'
            ) {
              throw new BadRequestException(
                `The attribute value for '${getLangOrFirstAvailableValue(
                  attribute.name,
                  lang,
                )}' must be a ${AttributeType.BOOLEAN}`,
              );
            }

            if (
              attribute.type === AttributeType.OBJECT &&
              typeof value !== 'object'
            ) {
              throw new BadRequestException(
                `The attribute value for '${getLangOrFirstAvailableValue(
                  attribute.name,
                  lang,
                )}' must be an ${AttributeType.OBJECT}`,
              );
            }
          }

          if (attribute.valueType === ValueType.MULTIPLE_SELECT) {
            /**
             * the value must be an array of AttributeValueType
             * {code: string; value: string}[]
             */
            if (!Array.isArray(value)) {
              throw new BadRequestException(
                `The attribute value for ${ValueType.MULTIPLE_SELECT} must be an array`,
              );
            }

            (value as Array<any>).forEach((val) => {
              if (
                !isAttributeValueType(
                  val,
                  attribute.type,
                  attribute.valueType as ValueType.MULTIPLE_SELECT,
                )
              ) {
                throw new BadRequestException(
                  `Attribute value for ${ValueType.MULTIPLE_SELECT} must be an array of ${attribute.type}. "${val}" is not a ${attribute.type}`,
                );
              }
            });
          }

          /**
           * Attribute value validation according to value type
           */
          if (
            attribute.valueType === ValueType.COLOR ||
            attribute.valueType === ValueType.DROPDOWN
          ) {
            // the value cannot be array
            if (Array.isArray(value)) {
              throw new BadRequestException(
                `Attribute value for ${ValueType.COLOR} or ${ValueType.DROPDOWN} cannot be an array`,
              );
            }

            /**
             * the value must be AttributeValueType
             * {code: string; value: string}
             */

            if (
              !isAttributeValueType(value, attribute.type, attribute.valueType)
            ) {
              throw new BadRequestException(
                `The attribute value for '${getLangOrFirstAvailableValue(
                  attribute.name,
                  lang,
                )}' is not in the good format`,
              );
            }

            /**
             * the value must be in attribute definedAttributeValues
             */
            const definedAttributeValues =
              await this._attributeValueRepository.find({
                where: { attributeId: attribute.id },
              });
            const findValueInDefinedValues = definedAttributeValues.filter(
              (definedValue) => definedValue.value === value,
            );

            if (
              !findValueInDefinedValues &&
              findValueInDefinedValues.length === 0
            ) {
              throw new BadRequestException(
                `The attribute value provided for '${getLangOrFirstAvailableValue(
                  attribute.name,
                  lang,
                )}' is not among defined values`,
              );
            }
          }

          if (
            attribute.valueType === ValueType.YES_NO &&
            attribute.type !== AttributeType.BOOLEAN
          ) {
            throw new BadRequestException(
              `ValueType ${ValueType.YES_NO} is only assignable to ${AttributeType.BOOLEAN}`,
            );
          }

          /**
           * push
           */
          const attributeValueItem: VariantAttributeValueModel<any> = {
            attribute,
            value,
            unit,
          };
          attributeValues.push(attributeValueItem);
        }),
      );

      /**
       * Product input validation
       */
      if (input.categoryIds.length > 1) {
        throw new BadRequestException(
          `a product cannot be found in more than one category`,
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

      return {
        attributeSetOptionValues,
        attributeValues,
        categories: [category],
        lang,
        user,
      };
    } catch (error) {
      throw new BadRequestException(
        `${AddVariantForInternalNeedService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
