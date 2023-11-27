import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
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
  isTStringInputValue,
  TString,
  UserCon,
} from '@glosuite/shared';
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
import {
  GenerateSKUFor,
  ProductType,
  QuantityProprety,
  ValueType,
} from 'src/domain/enums/items';
import { AttributeValueType } from 'src/domain/types/catalog/eav';
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
import { UpdatedType } from 'src/domain/enums/warehouses';
import { CustomProductData } from 'src/domain/types/purchases';
import { NewCustomProductModel } from 'src/domain/interfaces/items';
import { Supplier } from 'src/domain/entities/purchases';
import { SupplierRepository } from 'src/repositories/purchases';
import { ItemsReferenceService } from '../references/items';

@Injectable()
export class ProductVariantService {
  constructor(
    @InjectRepository(Attribute)
    private readonly _attributeRepository: AttributeRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Supplier)
    private readonly _supplierRepository: SupplierRepository,
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
    @InjectRepository(AttributeValue)
    private readonly _attributeValueRepository: AttributeValueRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(AttributeSet)
    private readonly _attributeSetRepository: AttributeSetRepository,
    @InjectRepository(AttributeOption)
    private readonly _attributeOptionRepository: AttributeOptionRepository,
    @InjectRepository(ProductVariantAttributeValues)
    private readonly _productVariantAttrValuesRepository: ProductVariantAttributeValuesRepository<any>,
    private readonly _itemsReferenceService: ItemsReferenceService,
  ) {}

  async generateSKU(
    product: Product,
    attributeValues?: VariantAttributeValueModel<any>[],
    generateSKUFor?: GenerateSKUFor,
  ): Promise<string> {
    let suffix: string;
    const lang = ISOLang.EN;

    if (attributeValues && attributeValues.length > 0) {
      attributeValues?.map(async (attrValue) => {
        let suffixItem = '';
        let attribute = attrValue.attribute;
        const value = attrValue.value;
        const unit = attrValue.unit;

        attribute = await this._attributeRepository.findOne({
          where: { id: attribute.id },
          relations: ['units'],
        });

        if (
          attribute.valueType !== ValueType.DROPDOWN &&
          attribute.valueType !== ValueType.MULTIPLE_SELECT
        ) {
          let tip: string;

          if (!!value) {
            if (attribute.type !== AttributeType.BOOLEAN) {
              tip =
                typeof value === 'number' || typeof value === 'string'
                  ? value.toString()
                  : typeof (value as AttributeValueType).value === 'number' ||
                    typeof (value as AttributeValueType).value === 'string'
                  ? (value as AttributeValueType).value.toString()
                  : isTStringInputValue((value as AttributeValueType).value)
                  ? getLangOrFirstAvailableValue(
                      (value as AttributeValueType).value as TString,
                      lang,
                    )
                  : '';

              suffixItem = unit
                ? tip + unit.symbol
                : attribute.units[0]
                ? tip + attribute.units[0].symbol
                : tip;
            }
          }
        }

        suffix = suffix ? suffix + '-' + suffixItem : suffixItem;
      });
    }

    let sku: string;
    let output: string;

    if (generateSKUFor && generateSKUFor === GenerateSKUFor.VARIANT) {
      sku = suffix ? product.sku + '-' + suffix.toUpperCase() : product.sku;
    } else {
      sku = await this._buildSKUForProduct(product);
    }

    output = sku.replace('--', '-');

    let variant = await this._productVariantRepository.findOne({
      where: {
        sku: output,
      },
    });

    let qty = 0;

    if (variant) {
      do {
        qty++;
        if (qty > 1) {
          const outputArray = output.split('-');
          const pos = Number(outputArray[1] + 1);
          output = `${output}-${pos}`;
        } else {
          output = `${output}-${qty}`;
        }

        variant = await this._productVariantRepository.findOne({
          where: { sku: output },
        });
      } while (!!variant);
    }

    return output;
  }

  async updateSKU(
    oldSku: string,
    newSku: string,
    variant: ProductVariant,
  ): Promise<string> {
    try {
      const variantSku = variant.sku.replace(oldSku, newSku);

      return variantSku;
    } catch (error) {
      throw new InternalServerErrorException(`${error.message}`);
    }
  }

  setVariantQuantity(
    variant: ProductVariant,
    quantity: number,
    type: UpdatedType,
    property: QuantityProprety,
  ): ProductVariant {
    switch (property) {
      case QuantityProprety.AVAILABLE:
        variant.quantity.available =
          type === UpdatedType.ADD
            ? variant.quantity.available + quantity
            : variant.quantity.available - quantity;
        break;
      case QuantityProprety.DISCOVERED:
        variant.quantity.discovered =
          type === UpdatedType.ADD
            ? variant.quantity.discovered + quantity
            : variant.quantity.discovered - quantity;
        break;
      case QuantityProprety.RESERVED:
        variant.quantity.reserved =
          type === UpdatedType.ADD
            ? variant.quantity.reserved + quantity
            : variant.quantity.reserved - quantity;
        break;
      case QuantityProprety.IN_TRANSIT:
        variant.quantity.inTransit =
          type === UpdatedType.ADD
            ? variant.quantity.inTransit + quantity
            : variant.quantity.inTransit - quantity;
        break;
      case QuantityProprety.DELIVERY_PROCESSING:
        variant.quantity.deliveryProcessing =
          type === UpdatedType.ADD
            ? variant.quantity.deliveryProcessing + quantity
            : variant.quantity.deliveryProcessing - quantity;
        break;
      case QuantityProprety.AWAITING_SAV:
        variant.quantity.awaitingSAV =
          type === UpdatedType.ADD
            ? variant.quantity.awaitingSAV + quantity
            : variant.quantity.awaitingSAV - quantity;
        break;
      case QuantityProprety.DELIVERED:
        variant.quantity.delivered =
          type === UpdatedType.ADD
            ? variant.quantity.delivered + quantity
            : variant.quantity.delivered - quantity;
        break;
      case QuantityProprety.GOT_OUT:
        variant.quantity.gotOut =
          type === UpdatedType.ADD
            ? variant.quantity.gotOut + quantity
            : variant.quantity.gotOut - quantity;
        break;
      case QuantityProprety.PENDING_INVESTIGATION:
        variant.quantity.pendingInvestigation =
          type === UpdatedType.ADD
            ? variant.quantity.pendingInvestigation + quantity
            : variant.quantity.pendingInvestigation - quantity;
        break;
      case QuantityProprety.LOST:
        variant.quantity.lost =
          type === UpdatedType.ADD
            ? variant.quantity.lost + quantity
            : variant.quantity.lost - quantity;
        break;
      case QuantityProprety.IS_DEAD:
        variant.quantity.isDead =
          type === UpdatedType.ADD
            ? variant.quantity.isDead + quantity
            : variant.quantity.isDead - quantity;
        break;
      case QuantityProprety.PENDING_RECEPTION:
        variant.quantity.pendingReception =
          type === UpdatedType.ADD
            ? variant.quantity.pendingReception + quantity
            : variant.quantity.pendingReception - quantity;
        break;
    }

    return variant;
  }

  async createCustomProducts(
    customProducts: CustomProductData[],
    lang: ISOLang,
    user: UserCon,
  ): Promise<NewCustomProductModel[]> {
    try {
      const newCustomProductsModel: NewCustomProductModel[] = [];

      console.log(customProducts);

      for (const customProduct of customProducts) {
        const {
          title,
          sku,
          attributeValues,
          quantity,
          purchaseCost,
          supplierId,
        } = customProduct;

        /**
         * Validations
         */

        // quantity validation
        if (Number.isNaN(quantity) || quantity <= 0) {
          throw new HttpException(
            `Invalid fields: quantity ${quantity}`,
            HttpStatus.BAD_REQUEST,
          );
        }

        // purchase cost validation
        if (Number.isNaN(purchaseCost) || purchaseCost < 0) {
          throw new HttpException(
            `Invalid fields: purchase cost ${purchaseCost}`,
            HttpStatus.BAD_REQUEST,
          );
        }

        // supplier id validation
        let supplier: Supplier;
        if (!isNullOrWhiteSpace(supplierId)) {
          supplier = await this._supplierRepository.findOne({
            where: { id: supplierId },
          });
          if (!supplier) {
            throw new NotFoundException(
              `Supplier with id ${supplierId} not found`,
            );
          }
        }

        const attributeValuesData: VariantAttributeValueModel<any>[] = [];

        // attributes values validation
        if (attributeValues && attributeValues.length > 0) {
          for (const attributeValue of attributeValues) {
            const { attributeId, value, unitId } = attributeValue;

            const attribute = await this._attributeRepository.findOne({
              where: { id: attributeId },
              relations: ['units'],
            });

            if (!attribute) {
              throw new NotFoundException(
                `Some attributes provided are not found`,
              );
            }

            let unit: Unit;
            if (!isNullOrWhiteSpace(unitId)) {
              unit = await this._unitRepository.findOne({
                where: { id: unitId },
              });

              if (!unit) {
                throw new NotFoundException(
                  `Unit with id ${attributeValue.unitId} is not found`,
                );
              }
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
                  `Attribute value for ${attribute.valueType} cannot be an array`,
                );
              }

              /**
               * the value must be AttributeValueType
               * {code: string; value: string}
               */

              if (
                !isAttributeValueType(
                  attributeValue.value,
                  attribute.type,
                  attribute.valueType,
                )
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

              (value as Array<any>).map((val) => {
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

            if (
              attribute.valueType === ValueType.YES_NO &&
              attribute.type !== AttributeType.BOOLEAN
            ) {
              throw new BadRequestException(
                `ValueType ${ValueType.YES_NO} is only assignable to ${AttributeType.BOOLEAN}`,
              );
            }

            attributeValuesData.push({
              attribute,
              value,
              unit,
            });
          }
        }

        /**
         * Get or create product
         */
        let product: Product;

        if (!isNullOrWhiteSpace(sku)) {
          product = await this._productRepository.findOne({
            where: { sku },
            relations: ['attributeSet', 'categories'],
          });
        }

        if (!product) {
          product = new Product();

          product.reference =
            await this._itemsReferenceService.generateProductReference(
              ProductType.SIMPLE,
            );
          product.title = title;
          product.productType = ProductType.SIMPLE;
          product.canBeSold = false;
          product.createdBy = user;
          product.categories = [];
          product.quantity = DEFAULT_PRODUCT_QUANTITY;

          // Get or create attributeSet
          let attributeSet = await this._attributeSetRepository.findOne({
            where: { title: `${sku}-Set` },
            relations: ['options'],
          });

          if (attributeSet) {
            if (attributeValuesData.length > 0) {
              const optionsToAdd: AttributeOption[] = [];
              attributeValuesData.map((attrOption) => {
                const { attribute, ...data } = attrOption;

                if (
                  !attributeSet.options.find(
                    (option) => option.attributeId === attribute.id,
                  )
                ) {
                  const attributeOption = new AttributeOption();

                  attributeOption.attribute = attribute;
                  attributeOption.attributeId = attribute.id;
                  attributeOption.required = true;
                  attributeOption.attributeSet = attributeSet;
                  attributeOption.attributeSetId = attributeSet.id;
                  attributeOption.createdBy = user;

                  optionsToAdd.push(attributeOption);
                }
              });

              await this._attributeOptionRepository.save(optionsToAdd);
            }
          } else {
            attributeSet = new AttributeSet();

            attributeSet.title = `${sku}-Set`;
            attributeSet.createdBy = user;

            await this._attributeSetRepository.save(attributeSet);

            // options
            const optionsToAdd: AttributeOption[] = [];
            if (attributeValuesData.length > 0) {
              attributeValuesData.map((attrOption) => {
                const { attribute, value, unit } = attrOption;

                const attributeOption = new AttributeOption();

                attributeOption.attribute = attribute;
                attributeOption.attributeId = attribute.id;
                attributeOption.required = true;
                attributeOption.attributeSet = attributeSet;
                attributeOption.attributeSetId = attributeSet.id;
                attributeOption.createdBy = user;

                optionsToAdd.push(attributeOption);
              });

              await this._attributeOptionRepository.save(optionsToAdd);
            }
          }

          if (attributeSet) {
            product.attributeSet = attributeSet;
            product.attributeSetId = attributeSet.id;
          }

          product.sku = !isNullOrWhiteSpace(sku)
            ? sku
            : await this.generateSKU(product, null, GenerateSKUFor.PRODUCT);

          await this._productRepository.save(product);
        }

        // Create product variant
        const productVariant = new ProductVariant();

        productVariant.reference =
          await this._itemsReferenceService.generateVariantReference();
        productVariant.title = title;
        productVariant.quantity = DEFAULT_PRODUCT_QUANTITY;
        productVariant.purchaseCost = purchaseCost;
        productVariant.product = product;
        productVariant.productId = product.id;
        productVariant.sku = await this.generateSKU(
          product,
          attributeValuesData,
        );
        productVariant.createdBy = user;

        await this._productVariantRepository.save(productVariant);

        /**
         * Variant attribute values
         */
        if (attributeValuesData.length > 0) {
          const attributeValuesToAdd: ProductVariantAttributeValues<any>[] = [];

          attributeValuesData.map((attrValue) => {
            const { attribute, value, unit } = attrValue;

            const productVariantAttrValue =
              new ProductVariantAttributeValues<any>();

            productVariantAttrValue.value = value;
            productVariantAttrValue.attributeId = attribute.id;
            productVariantAttrValue.attribute = attribute;
            productVariantAttrValue.variantId = productVariant.id;
            productVariantAttrValue.productVariant = productVariant;
            if (unit) {
              productVariantAttrValue.unit = unit;
              productVariantAttrValue.unitId = unit.id;
            }
            productVariantAttrValue.createdBy = user;

            attributeValuesToAdd.push(productVariantAttrValue);
          });

          await this._productVariantAttrValuesRepository.save(
            attributeValuesToAdd,
          );

          productVariant.attributeValues = attributeValuesToAdd;
        }

        newCustomProductsModel.push({
          product,
          variant: productVariant,
          supplier,
          quantity,
        });
      }

      return newCustomProductsModel;
    } catch (error) {
      throw new InternalServerErrorException(`${error.message}`);
    }
  }

  private async _buildSKUForProduct(product: Product): Promise<string> {
    const day = new Date().getDay();
    const month = new Date().getMonth();
    const year = new Date().getDate();
    let i = 0;

    let sku = `GLO${getLangOrFirstAvailableValue(
      product.title,
      ISOLang.FR,
    ).slice(0, 4)}${day}${month}${year}CM`;
    let productExist = await this._productRepository.findOne({
      where: { sku },
    });

    while (productExist) {
      i++;
      sku = `GLO${getLangOrFirstAvailableValue(product.title, ISOLang.FR).slice(
        0,
        4,
      )}${day}${month}${year}${i}CM`;
      productExist = await this._productRepository.findOne({ where: { sku } });
    }

    return sku.toUpperCase();
  }
}
