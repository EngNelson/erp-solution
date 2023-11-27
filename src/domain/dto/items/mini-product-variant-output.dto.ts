import { getLangOrFirstAvailableValue, Image, ISOLang } from '@glosuite/shared';
import { ProductType } from 'src/domain/enums/items';
import { ShippingClass } from 'src/domain/enums/orders';
import { ProductQuantity } from 'src/domain/interfaces';
import { ProductVariantItemDetails } from 'src/domain/types/catalog/items';
import { MiniCategoryOutput } from '../structures';
import { MiniAttributeOutput } from './eav';
import { VariantAttributeValueItemOutput } from './variant-attribute-value-item-output.dto';
import {
  GetVariantsProductItemOutput,
  MiniProductItemItemOutput,
} from './mini-product-item-item-output.dto';
import { ProductItemItemOutput } from './product-item-item-output.dto';

export class MiniProductVariantOutput {
  constructor(variant: Partial<ProductVariantItemDetails>, lang: ISOLang) {
    this.id = variant.id;
    this.magentoId = variant.magentoId ? variant.magentoId : null;
    this.magentoSKU = variant.magentoSKU ? variant.magentoSKU : null;
    this.reference = variant.reference;
    this.title = getLangOrFirstAvailableValue(variant.title, lang);
    // this.shortDescription = variant.shortDescription
    //   ? getLangOrFirstAvailableValue(variant.shortDescription, lang)
    //   : null;
    // this.description = variant.description
    //   ? getLangOrFirstAvailableValue(variant.description, lang)
    //   : null;
    this.shippingClass = variant.shippingClass;
    this.salePrice = variant.salePrice;
    this.purchaseCost = variant.purchaseCost ? variant.purchaseCost : null;
    this.quantity = variant.quantity;
    this.sku = variant.sku;
    this.thumbnail = variant.thumbnail;
    this.productType = variant.productType;
    this.categories = variant.categories.map(
      (category) => new MiniCategoryOutput(category, lang),
    );
    this.attributeValues = variant.attributeValues
      ? variant.attributeValues.map(
          (attrValue) =>
            new VariantAttributeValueItemOutput(
              attrValue.variantAttributeValue,
              new MiniAttributeOutput(attrValue.attribute, lang),
              attrValue.value,
              attrValue.unit,
              lang,
            ),
        )
      : [];
    this.productItems =
      variant.productItems?.length > 0
        ? variant.productItems.map(
            (itemDetails) => new GetVariantsProductItemOutput(itemDetails),
          )
        : [];
    this.createdAt = variant.createdAt;
    this.lastUpdate = variant.lastUpdate;
  }

  id: string;
  magentoId?: number;
  magentoSKU?: string;
  reference: string;
  title: string;
  // shortDescription?: string;
  // description?: string;
  shippingClass: ShippingClass;
  salePrice: number;
  purchaseCost?: number;
  quantity: ProductQuantity;
  sku: string;
  thumbnail: Image;
  productType: ProductType;
  categories: MiniCategoryOutput[];
  attributeValues?: VariantAttributeValueItemOutput[];
  productItems: GetVariantsProductItemOutput[];
  createdAt: Date;
  lastUpdate: Date;
}

export class GetOrderByIdMiniProductVariantOutput {
  constructor(variant: Partial<ProductVariantItemDetails>, lang: ISOLang) {
    this.id = variant.id;
    this.magentoId = variant.magentoId ? variant.magentoId : null;
    this.magentoSKU = variant.magentoSKU ? variant.magentoSKU : null;
    this.reference = variant.reference;
    this.title = getLangOrFirstAvailableValue(variant.title, lang);
    this.shippingClass = variant.shippingClass;
    this.salePrice = variant.salePrice;
    this.purchaseCost = variant.purchaseCost ? variant.purchaseCost : null;
    this.quantity = variant.quantity;
    this.sku = variant.sku;
    this.thumbnail = variant.thumbnail;
    this.productType = variant.productType;
    this.categories = variant.categories.map(
      (category) => new MiniCategoryOutput(category, lang),
    );
    this.attributeValues = variant.attributeValues
      ? variant.attributeValues.map(
          (attrValue) =>
            new VariantAttributeValueItemOutput(
              attrValue.variantAttributeValue,
              new MiniAttributeOutput(attrValue.attribute, lang),
              attrValue.value,
              attrValue.unit,
              lang,
            ),
        )
      : [];
    this.createdAt = variant.createdAt;
    this.lastUpdate = variant.lastUpdate;
  }

  id: string;
  magentoId?: number;
  magentoSKU?: string;
  reference: string;
  title: string;
  shippingClass: ShippingClass;
  salePrice: number;
  purchaseCost?: number;
  quantity: ProductQuantity;
  sku: string;
  thumbnail: Image;
  productType: ProductType;
  categories: MiniCategoryOutput[];
  attributeValues?: VariantAttributeValueItemOutput[];
  createdAt: Date;
  lastUpdate: Date;
}
