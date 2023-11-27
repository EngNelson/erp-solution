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
  ProductComposition,
  ProductVariant,
  ProductVariantAttributeValues,
  VariantComposition,
} from 'src/domain/entities/items';
import {
  Attribute,
  AttributeOption,
  AttributeValue,
  Unit,
} from 'src/domain/entities/items/eav';
import { ProductType, ValueType } from 'src/domain/enums/items';
import { VariantAttributeValueModel } from 'src/domain/types/catalog/items';
import {
  AttributeOptionRepository,
  AttributeRepository,
  AttributeValueRepository,
  ProductCompositionRepository,
  ProductRepository,
  ProductVariantAttributeValuesRepository,
  ProductVariantRepository,
  UnitRepository,
  VariantCompositionRepository,
} from 'src/repositories/items';
import { ProductVariantService } from 'src/services/generals';
import { ItemsReferenceService } from 'src/services/references/items';
import { SharedService } from 'src/services/utilities';
import { AddProductVariantInput } from './dto';

type ValidationResult = {
  product: Product;
  attributeValues: VariantAttributeValueModel<any>[];
  children: ProductVariant[];
  compositions: ProductComposition[];
  isAttributeValues: boolean;
  isChildren: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class AddProductVariantService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(AttributeValue)
    private readonly _attributeValueRepository: AttributeValueRepository,
    @InjectRepository(Attribute)
    private readonly _attributeRepository: AttributeRepository,
    @InjectRepository(AttributeOption)
    private readonly _attributeOptionRepository: AttributeOptionRepository,
    @InjectRepository(ProductVariantAttributeValues)
    private readonly _productVariantAttrValuesRepository: ProductVariantAttributeValuesRepository<any>,
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
    @InjectRepository(ProductComposition)
    private readonly _productCompositionRepository: ProductCompositionRepository,
    @InjectRepository(VariantComposition)
    private readonly _variantCompositionRepository: VariantCompositionRepository,
    private readonly _itemsReferenceService: ItemsReferenceService,
    private readonly _productVariantSkuService: ProductVariantService,
    private readonly _sharedService: SharedService,
  ) {}

  async addProductVariant(
    input: AddProductVariantInput,
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
    input: AddProductVariantInput,
    result: ValidationResult,
  ): Promise<ProductVariantItemOutput> {
    const productVariant = new ProductVariant();

    try {
      const {
        product,
        attributeValues,
        children,
        compositions,
        isAttributeValues,
        isChildren,
        lang,
        user,
      } = result;

      productVariant.reference =
        await this._itemsReferenceService.generateVariantReference();

      productVariant.title = product.title;
      productVariant.shortDescription = input.shortDescription;
      productVariant.description = input.description;
      productVariant.shippingClass = input.shippingClass;

      if (product.productType === ProductType.SIMPLE) {
        productVariant.quantity = DEFAULT_PRODUCT_QUANTITY;
        productVariant.purchaseCost = input.purchaseCost;
      }

      productVariant.salePrice = input.salePrice;
      productVariant.rentPrie = input.rentPrice;

      productVariant.productId = product.id;
      productVariant.product = product;

      productVariant.sku = await this._productVariantSkuService.generateSKU(
        product,
        attributeValues,
      );

      if (input.decouvert) {
        productVariant.quantity.discovered = input.decouvert;
        product.quantity.discovered += input.decouvert;

        await this._productRepository.save(product);
      }

      if (input.thumbnail) {
        productVariant.thumbnail = input.thumbnail;
      }

      if (input.gallery) {
        productVariant.gallery = input.gallery;
      }

      productVariant.createdBy = user;

      /**
       * Calculate stock value
       */

      await this._productVariantRepository.save(productVariant);

      if (isAttributeValues) {
        const attributeValuesToAdd: ProductVariantAttributeValues<any>[] = [];

        attributeValues.map((attrValue) => {
          const productVariantAttrValue =
            new ProductVariantAttributeValues<any>();

          productVariantAttrValue.value = attrValue.value;
          productVariantAttrValue.attributeId = attrValue.attribute.id;
          productVariantAttrValue.attribute = attrValue.attribute;
          productVariantAttrValue.variantId = productVariant.id;
          productVariantAttrValue.productVariant = productVariant;

          if (attrValue.unit) {
            productVariantAttrValue.unit = attrValue.unit;
            productVariantAttrValue.unitId = attrValue.unit.id;
          }

          productVariantAttrValue.createdBy = user;

          attributeValuesToAdd.push(productVariantAttrValue);
        });

        await this._productVariantAttrValuesRepository.save(
          attributeValuesToAdd,
        );

        attributeValues.map((attributeValue) => {
          const { attribute, value, unit } = attributeValue;

          attributeValue.unit = unit ? unit : attribute.units[0];

          return attributeValue;
        });
      }

      if (isChildren) {
        const variantCompositonsToAdd: VariantComposition[] = [];

        children.map((child) => {
          const variantComposition = new VariantComposition();

          const composition = compositions.find(
            (composition) => composition.childId === child.productId,
          );
          variantComposition.required = composition.required;
          variantComposition.defaultQuantity = composition.defaultQuantity;
          variantComposition.position = composition.position;
          variantComposition.parent = productVariant;
          variantComposition.parentId = productVariant.id;
          variantComposition.child = child;
          variantComposition.childId = child.id;

          variantComposition.createdBy = user;

          variantCompositonsToAdd.push(variantComposition);
        });

        await this._variantCompositionRepository.save(variantCompositonsToAdd);

        productVariant.children = variantCompositonsToAdd;

        await this._productVariantRepository.save(productVariant);
      }

      const variantDetails =
        await this._sharedService.buildVariantDetailsOutput(productVariant);

      /**
       * Emit the new created product on queue: Upstream
       */

      return new ProductVariantItemOutput(variantDetails, lang);
    } catch (error) {
      if (productVariant.id) {
        await this._productRepository.delete(productVariant.id);
      }
      throw new ConflictException(
        `${AddProductVariantService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: AddProductVariantInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const product = await this._productRepository.findOne(input.productId, {
        relations: ['categories', 'attributeSet'],
      });

      if (!product) {
        throw new NotFoundException(`Product provided not found`);
      }

      /**
       * attribute values are not necessary for bundled or grouped product
       */
      if (
        input.attributeValues &&
        input.attributeValues.length > 0 &&
        (product.productType === ProductType.BUNDLED ||
          product.productType === ProductType.GROUPED)
      ) {
        throw new BadRequestException(
          `Attribute values are not supported by ${product.productType} product`,
        );
      }

      /**
       * variantIds are not necessary for simple product
       */
      if (
        input.variantIds &&
        input.variantIds.length > 0 &&
        product.productType === ProductType.SIMPLE
      ) {
        throw new BadRequestException(
          `Children variants are not supported by ${product.productType} product`,
        );
      }

      /**
       * get required attributes according to product attribute-set
       */
      const requiredAttributeIds: string[] = [];
      const inputAttributes: Attribute[] = [];

      const attributeValues: VariantAttributeValueModel<any>[] = [];

      if (input.attributeValues && input.attributeValues.length > 0) {
        await Promise.all(
          input.attributeValues.map(async (attributeValue) => {
            const inputAttribute = await this._attributeRepository.findOne(
              attributeValue.attributeId,
              { relations: ['units'] },
            );
            if (!inputAttribute) {
              throw new NotFoundException(
                `Some attributes provided are not found`,
              );
            }

            inputAttributes.push(inputAttribute);

            /**
             * Is unit provided ?
             */
            if (
              isNullOrWhiteSpace(attributeValue.unitId) &&
              inputAttribute.units.length > 1
            ) {
              throw new BadRequestException(
                `Specify the unit for which the value should be recorded for "${getLangOrFirstAvailableValue(
                  inputAttribute.name,
                  lang,
                )}"`,
              );
            }

            let unit: Unit;

            if (
              attributeValue.unitId &&
              !isNullOrWhiteSpace(attributeValue.unitId)
            ) {
              unit = await this._unitRepository.findOne(attributeValue.unitId);

              if (!unit) {
                throw new NotFoundException(
                  `Unit with id ${attributeValue.unitId} is not found`,
                );
              }
            }

            /**
             * Attribute value validation according to attribute type
             */
            if (inputAttribute.valueType !== ValueType.MULTIPLE_SELECT) {
              if (
                inputAttribute.type === AttributeType.STRING &&
                typeof attributeValue.value !== 'string'
              ) {
                throw new BadRequestException(
                  `The attribute value for '${getLangOrFirstAvailableValue(
                    inputAttribute.name,
                    lang,
                  )}' must be a ${AttributeType.STRING}`,
                );
              }

              if (
                inputAttribute.type === AttributeType.NUMBER &&
                typeof attributeValue.value !== 'number'
              ) {
                throw new BadRequestException(
                  `The attribute value for '${getLangOrFirstAvailableValue(
                    inputAttribute.name,
                    lang,
                  )}' must be a ${AttributeType.NUMBER}`,
                );
              }

              if (
                inputAttribute.type === AttributeType.BOOLEAN &&
                typeof attributeValue.value !== 'boolean'
              ) {
                throw new BadRequestException(
                  `The attribute value for '${getLangOrFirstAvailableValue(
                    inputAttribute.name,
                    lang,
                  )}' must be a ${AttributeType.BOOLEAN}`,
                );
              }

              if (
                inputAttribute.type === AttributeType.OBJECT &&
                typeof attributeValue.value !== 'object'
              ) {
                throw new BadRequestException(
                  `The attribute value for '${getLangOrFirstAvailableValue(
                    inputAttribute.name,
                    lang,
                  )}' must be an ${AttributeType.OBJECT}`,
                );
              }
            }

            /**
             * Attribute value validation according to value type
             */
            if (
              inputAttribute.valueType === ValueType.COLOR ||
              inputAttribute.valueType === ValueType.DROPDOWN
            ) {
              // the value cannot be array
              if (Array.isArray(attributeValue.value)) {
                throw new BadRequestException(
                  `Attribute value for ${inputAttribute.valueType} cannot be an array`,
                );
              }

              /**
               * the value must be AttributeValueType
               * {code: string; value: string}
               */

              if (
                !isAttributeValueType(
                  attributeValue.value,
                  inputAttribute.type,
                  inputAttribute.valueType,
                )
              ) {
                throw new BadRequestException(
                  `The attribute value for '${getLangOrFirstAvailableValue(
                    inputAttribute.name,
                    lang,
                  )}' is not in the good format`,
                );
              }

              /**
               * the value must be in attribute definedAttributeValues
               */
              const definedAttributeValues =
                await this._attributeValueRepository.find({
                  where: { attributeId: inputAttribute.id },
                });
              const findValueInDefinedValues = definedAttributeValues.filter(
                (definedValue) => definedValue.value === attributeValue.value,
              );
              if (
                !findValueInDefinedValues &&
                findValueInDefinedValues.length === 0
              ) {
                throw new BadRequestException(
                  `The attribute value provided for '${getLangOrFirstAvailableValue(
                    inputAttribute.name,
                    lang,
                  )}' is not among defined values`,
                );
              }
            }

            if (inputAttribute.valueType === ValueType.MULTIPLE_SELECT) {
              /**
               * the value must be an array of AttributeValueType
               * {code: string; value: string}[]
               */
              if (!Array.isArray(attributeValue.value)) {
                throw new BadRequestException(
                  `The attribute value for ${ValueType.MULTIPLE_SELECT} must be an array`,
                );
              }

              (attributeValue.value as Array<any>).map((value) => {
                if (
                  !isAttributeValueType(
                    value,
                    inputAttribute.type,
                    inputAttribute.valueType as ValueType.MULTIPLE_SELECT,
                  )
                ) {
                  throw new BadRequestException(
                    `Attribute value for ${ValueType.MULTIPLE_SELECT} must be an array of ${inputAttribute.type}. "${value}" is not a ${inputAttribute.type}`,
                  );
                }
              });
            }

            if (
              inputAttribute.valueType === ValueType.YES_NO &&
              inputAttribute.type !== AttributeType.BOOLEAN
            ) {
              throw new BadRequestException(
                `ValueType ${ValueType.YES_NO} is only assignable to ${AttributeType.BOOLEAN}`,
              );
            }

            const variantAttributeValueInput: VariantAttributeValueModel<any> =
              { attribute: inputAttribute, value: attributeValue.value, unit };
            attributeValues.push(variantAttributeValueInput);
          }),
        );
      }

      if (product.attributeSet) {
        const attrOptions = await this._attributeOptionRepository.find({
          where: { attributeSetId: product.attributeSetId },
        });
        attrOptions.map((option) => {
          if (option.required) {
            requiredAttributeIds.push(option.attributeId);
          }
        });
        const requiredAttributes = await this._attributeRepository.findByIds(
          requiredAttributeIds,
        );

        /**
         * check if each product required attribute is in inputAttributes
         */
        let requiredAttrFoundInInput = 0;
        requiredAttributes.forEach((requiredAttr) => {
          const isThisRequiredAttributeInInputAttr = inputAttributes.some(
            (inputAttr) => requiredAttr.id === inputAttr.id,
          );
          if (isThisRequiredAttributeInInputAttr) {
            requiredAttrFoundInInput++;
          }
        });

        if (requiredAttrFoundInInput < requiredAttributes.length) {
          throw new BadRequestException(
            `Some required attributes for attribute-set '${product.attributeSet.title}' are missing`,
          );
        }
      }

      const children: ProductVariant[] = [];
      let compositions: ProductComposition[] = [];

      if (input.variantIds && input.variantIds.length > 0) {
        if (input.variantIds.length !== product.children.length) {
          throw new BadRequestException(
            `The product ${getLangOrFirstAvailableValue(
              product.title,
              ISOLang.FR,
            )} need ${product.children.length} children not ${
              input.variantIds.length
            }`,
          );
        }

        const productChildren: Product[] = [];

        compositions = await this._productCompositionRepository.find({
          where: { parentId: product.id },
          relations: ['child'],
        });

        if (compositions?.length > 0) {
          compositions.map((composition) => {
            productChildren.push(composition.child);

            if (
              !input.variantIds.find(
                (variantId) => variantId === composition.childId,
              )
            ) {
              throw new BadRequestException(
                `The child ${getLangOrFirstAvailableValue(
                  composition.child.title,
                  ISOLang.FR,
                )} do not have his variant within the bundle product`,
              );
            }
          });
        }

        input.variantIds.map(async (variantId) => {
          const child = await this._productVariantRepository.findOne(
            variantId,
            { relations: ['product'] },
          );

          if (!child) {
            throw new NotFoundException(`Variant of id ${variantId} not found`);
          }

          if (child.product.productType !== ProductType.SIMPLE) {
            throw new BadRequestException(
              `The variant ${getLangOrFirstAvailableValue(
                child.title,
                ISOLang.FR,
              )} is a ${
                child.product.productType
              } product and cannot be added as a variant child`,
            );
          }

          if (
            !productChildren.find(
              (productChild) => productChild.id === child.productId,
            )
          ) {
            throw new BadRequestException(
              `The variant ${getLangOrFirstAvailableValue(
                child.title,
                ISOLang.FR,
              )} do not belong to this bundle product`,
            );
          }

          children.push(child);
        });
      }

      return {
        product,
        attributeValues,
        children,
        compositions,
        isAttributeValues: attributeValues && attributeValues.length > 0,
        isChildren: children && children.length > 0,
        lang,
        user,
      };
    } catch (error) {
      throw new BadRequestException(
        `${AddProductVariantService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
