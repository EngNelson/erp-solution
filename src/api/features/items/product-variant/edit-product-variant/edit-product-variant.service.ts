import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AttributeType,
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
  AttributeSet,
  AttributeValue,
  Unit,
} from 'src/domain/entities/items/eav';
import { ProductType, ValueType } from 'src/domain/enums/items';
import { VariantAttributeValueModel } from 'src/domain/types/catalog/items';
import {
  AttributeOptionRepository,
  AttributeRepository,
  AttributeSetRepository,
  AttributeValueRepository,
  ProductCompositionRepository,
  ProductRepository,
  ProductVariantAttributeValuesRepository,
  ProductVariantRepository,
  UnitRepository,
  VariantCompositionRepository,
} from 'src/repositories/items';
import { SharedService } from 'src/services/utilities';
import { EditProductVariantInput } from './dto';
import { UpdateMagentoDataService } from 'src/services/generals';

type ValidationResult = {
  productVariant: ProductVariant;
  actualVariantAttributeValues: VariantAttributeValueModel<any>[];
  newVariantAttributeValues: VariantAttributeValueModel<any>[];
  newChildren: ProductVariant[];
  compositions: ProductComposition[];
  isActualAttributeValues: boolean;
  isNewAttributeValues: boolean;
  isNewChildren: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class EditProductVariantService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(AttributeSet)
    private readonly _attributeSetRepository: AttributeSetRepository,
    @InjectRepository(AttributeValue)
    private readonly _attributeValueRepository: AttributeValueRepository,
    @InjectRepository(Attribute)
    private readonly _attributeRepository: AttributeRepository,
    @InjectRepository(AttributeOption)
    private readonly _attributeOptionRepository: AttributeOptionRepository,
    @InjectRepository(ProductVariantAttributeValues)
    private readonly _productVariantAttributeValuesRepository: ProductVariantAttributeValuesRepository<any>,
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
    @InjectRepository(ProductComposition)
    private readonly _productCompositionRepository: ProductCompositionRepository,
    @InjectRepository(VariantComposition)
    private readonly _variantCompositionRepository: VariantCompositionRepository,
    private readonly _sharedService: SharedService,
    private readonly _updateMagentoDataService: UpdateMagentoDataService,
  ) {}

  async editProductVariant(
    input: EditProductVariantInput,
    user: UserCon,
  ): Promise<ProductVariantItemOutput> {
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
    input: EditProductVariantInput,
    result: ValidationResult,
  ): Promise<ProductVariantItemOutput> {
    try {
      const {
        productVariant,
        actualVariantAttributeValues,
        newVariantAttributeValues,
        newChildren,
        compositions,
        isActualAttributeValues,
        isNewAttributeValues,
        isNewChildren,
        lang,
        user,
      } = result;

      if (input.thumbnail) {
        productVariant.thumbnail = input.thumbnail;
      }

      if (input.gallery) {
        productVariant.gallery = input.gallery;
      }

      if (input.salePrice) {
        productVariant.salePrice = input.salePrice;
      }

      if (productVariant.product.productType === ProductType.SIMPLE) {
        productVariant.purchaseCost = input.purchaseCost;
      }

      if (
        input.decouvert &&
        productVariant.product.productType === ProductType.SIMPLE
      ) {
        const product = await this._productRepository.findOne(
          productVariant.productId,
        );
        product.quantity.discovered -= productVariant.quantity.discovered;
        product.quantity.discovered += input.decouvert;

        productVariant.quantity.discovered = input.decouvert;

        const newQuantity = productVariant.quantity.available + input.decouvert;

        this._updateMagentoDataService.updateSingleProductQty(
          productVariant.magentoSKU,
          newQuantity,
        );

        await this._productRepository.save(product);
      }

      if (input.rentPrice) {
        productVariant.rentPrie = input.rentPrice;
      }

      if (input.shortDescription) {
        if (!productVariant.shortDescription) {
          productVariant.shortDescription = input.shortDescription;
        } else {
          for (const key in input.shortDescription) {
            productVariant.shortDescription[key] = input.shortDescription[key];
          }
        }
      }

      if (input.description) {
        if (!productVariant.description) {
          productVariant.description = input.description;
        } else {
          for (const key in input.description) {
            productVariant.description[key] = input.description[key];
          }
        }
      }

      if (input.shippingClass) {
        productVariant.shippingClass = input.shippingClass;
      }

      const attributeValuesToUpdate: ProductVariantAttributeValues<any>[] = [];
      const attributeValuesToAdd: ProductVariantAttributeValues<any>[] = [];

      /**
       * If old variant attribute values
       * update on db
       */
      if (isActualAttributeValues) {
        await Promise.all(
          actualVariantAttributeValues.map(async (actualVariantAttrValue) => {
            const { variantAttributeValue, attribute, value, unit } =
              actualVariantAttrValue;

            if (unit) {
              variantAttributeValue.unit = unit;
              variantAttributeValue.unitId = unit.id;
            }

            variantAttributeValue.value = value;

            variantAttributeValue.attribute = attribute;
            variantAttributeValue.attributeId = attribute.id;

            variantAttributeValue.productVariant = productVariant;
            variantAttributeValue.variantId = productVariant.id;

            variantAttributeValue.updatedBy = user;

            attributeValuesToUpdate.push(variantAttributeValue);
          }),
        );
      }

      /**
       * Id new variant attribute values
       * Add on db
       */
      if (isNewAttributeValues) {
        newVariantAttributeValues.map(async (newAttrValue) => {
          const newVariantAttributeValue =
            new ProductVariantAttributeValues<any>();

          newVariantAttributeValue.value = newAttrValue.value;
          newVariantAttributeValue.attributeId = newAttrValue.attribute.id;
          newVariantAttributeValue.attribute = newAttrValue.attribute;
          newVariantAttributeValue.variantId = productVariant.id;
          newVariantAttributeValue.productVariant = productVariant;

          if (newAttrValue.unit) {
            newVariantAttributeValue.unit = newAttrValue.unit;
            newVariantAttributeValue.unitId = newAttrValue.unit.id;
          }

          newVariantAttributeValue.createdBy = user;

          attributeValuesToAdd.push(newVariantAttributeValue);
        });
      }

      let allVariantAttributeValues: VariantAttributeValueModel<any>[] = [];
      allVariantAttributeValues = actualVariantAttributeValues.concat(
        newVariantAttributeValues,
      );

      productVariant.updatedBy = user;

      await this._productVariantRepository.save(productVariant);

      if (isActualAttributeValues) {
        await this._productVariantAttributeValuesRepository.save(
          attributeValuesToUpdate,
        );
      }

      if (isNewAttributeValues) {
        await this._productVariantAttributeValuesRepository.save(
          attributeValuesToAdd,
        );
      }

      allVariantAttributeValues.map((allVariantAttrValue) => {
        const { attribute, value, unit } = allVariantAttrValue;

        allVariantAttrValue.unit = unit ? unit : attribute.units[0];

        return allVariantAttrValue;
      });

      if (isNewChildren) {
        const variantCompositonsToAdd: VariantComposition[] = [];

        newChildren.map((child) => {
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

        /**
         * Delete actual children
         */
        const variantCompositionsToDelete =
          await this._variantCompositionRepository.find({
            parentId: productVariant.id,
          });

        if (variantCompositionsToDelete.length > 0) {
          variantCompositionsToDelete.map((compositionToDelete) => {
            this._variantCompositionRepository.delete(compositionToDelete.id);
          });
        }
      }

      const variantDetails =
        await this._sharedService.buildVariantDetailsOutput(productVariant);

      return new ProductVariantItemOutput(variantDetails, lang);
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${EditProductVariantService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: EditProductVariantInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      /**
       * Get the variant to update
       */
      const productVariant = await this._productVariantRepository.findOne(
        input.variantId,
        { relations: ['product', 'attributeValues', 'productItems'] },
      );
      if (!productVariant) {
        throw new NotFoundException(
          `Variant with id '${input.variantId}' not found`,
        );
      }

      /**
       * Load variant categories from product
       */
      productVariant.product = await this._productRepository.findOne(
        productVariant.productId,
        { relations: ['categories'] },
      );

      /**
       * Get the attributeSet
       * to check if there are new attributes added
       */
      const attributeSet = await this._attributeSetRepository.findOne(
        productVariant.product.attributeSetId,
        { relations: ['options'] },
      );
      if (
        !attributeSet &&
        productVariant.product.productType === ProductType.SIMPLE
      ) {
        throw new NotFoundException(
          `This product does not have any attribute-set`,
        );
      }

      /**
       * attribute values are not necessary for bundled or grouped product
       */
      if (
        input.attributeValues &&
        input.attributeValues.length > 0 &&
        (productVariant.product.productType === ProductType.BUNDLED ||
          productVariant.product.productType === ProductType.GROUPED)
      ) {
        throw new BadRequestException(
          `Attribute values are not supported by ${productVariant.product.productType} product`,
        );
      }

      /**
       * variantIds are not necessary for simple product
       */
      if (
        input.variantIds &&
        input.variantIds.length > 0 &&
        productVariant.product.productType === ProductType.SIMPLE
      ) {
        throw new BadRequestException(
          `Children variants are not supported by ${productVariant.product.productType} product`,
        );
      }

      const actualVariantAttributeValues: VariantAttributeValueModel<any>[] =
        [];
      const newVariantAttributeValues: VariantAttributeValueModel<any>[] = [];
      const requiredAttributeIds: string[] = [];
      const inputAttributes: Attribute[] = [];

      /**
       * Input validations
       */
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
                  `Attribute value for ${ValueType.COLOR} or ${ValueType.DROPDOWN} cannot be an array`,
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
                  `(${getLangOrFirstAvailableValue(
                    inputAttribute.name,
                    lang,
                  )}): The attribute value for ${
                    ValueType.MULTIPLE_SELECT
                  } must be an array`,
                );
              }

              (attributeValue.value as Array<any>).forEach((value) => {
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
              {
                attribute: inputAttribute,
                value: attributeValue.value,
                unit,
              };

            /**
             * On recupere les valeurs attributs deja enregistre pour le variant
             * Si un attribut est present, on le met dans actualVariantAttributeValues
             * sinon on le met dans newVariantAttributeValues
             */
            if (!isNullOrWhiteSpace(attributeValue.variantAttributeValueId)) {
              const variantAttrValue =
                await this._productVariantAttributeValuesRepository.findOne(
                  attributeValue.variantAttributeValueId,
                );

              if (!variantAttrValue) {
                throw new NotFoundException(
                  `Variant attribute value not found`,
                );
              }

              variantAttributeValueInput.variantAttributeValue =
                variantAttrValue;

              actualVariantAttributeValues.push(variantAttributeValueInput);
            } else {
              newVariantAttributeValues.push(variantAttributeValueInput);
            }
          }),
        );
      }

      if (attributeSet) {
        /**
         * Check if the required attributes of the product are all taken
         * in consideration in inputAttributes
         */

        /**
         * get required attributes according to product attribute-set
         */
        const attrOptions = await this._attributeOptionRepository.find({
          attributeSetId: attributeSet.id,
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
         * Proceed to the verification
         */
        let requiredAttrNotFoundInInput = 0;
        requiredAttributes.map((requiredAttr) => {
          const isAttributeInInput = inputAttributes.some(
            (inputAttr) => requiredAttr.id === inputAttr.id,
          );

          if (isAttributeInInput) requiredAttrNotFoundInInput++;
        });

        if (requiredAttrNotFoundInInput < requiredAttributes.length) {
          throw new BadRequestException(
            `Some required attributes for attribute-set '${attributeSet.title}' are missing`,
          );
        }
      }

      const newChildren: ProductVariant[] = [];
      let compositions: ProductComposition[] = [];

      if (input.variantIds && input.variantIds.length > 0) {
        const product = await this._productRepository.findOne(
          productVariant.productId,
          { relations: ['children'] },
        );

        if (!product) {
          throw new BadRequestException('An error occurred');
        }

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

          newChildren.push(child);
        });
      }

      // console.log(
      //   `actual : ${actualVariantAttributeValues.length}`,
      //   actualVariantAttributeValues,
      // );
      // console.log(
      //   `new : ${newVariantAttributeValues.length}`,
      //   newVariantAttributeValues,
      // );

      // throw new BadRequestException('work');

      return {
        productVariant,
        actualVariantAttributeValues,
        newVariantAttributeValues,
        newChildren,
        compositions,
        isActualAttributeValues: actualVariantAttributeValues.length > 0,
        isNewAttributeValues: newVariantAttributeValues.length > 0,
        isNewChildren: newChildren && newChildren.length > 0,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${EditProductVariantService.name} - ${this._tryValidation.name}`,
        error.response,
      );
    }
  }
}
