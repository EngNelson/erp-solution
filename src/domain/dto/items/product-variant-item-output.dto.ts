import {
  DEFAULT_STOCK_VALUE_QUANTITY,
  getLangOrFirstAvailableValue,
  Image,
  ISOLang,
  MediaGallery,
} from '@glosuite/shared';
import { ProductType } from 'src/domain/enums/items';
import { ShippingClass } from 'src/domain/enums/orders';
import { ProductQuantity } from 'src/domain/interfaces';
import { StockValueModel } from 'src/domain/interfaces/analytics';
import { ProductVariantItemDetails } from 'src/domain/types/catalog/items';
import { ProductItemDetailsOutput, VariantAttributeValueItemOutput } from '.';
import { MiniUserOutput } from '../auth';
import { VoucherItemOutput } from '../orders';
import { MiniCategoryOutput } from '../structures';
import { MiniAttributeOutput } from './eav';

export class ProductVariantItemOutput {
  constructor(variantItem: ProductVariantItemDetails, lang: ISOLang) {
    this.id = variantItem.id;
    this.magentoId = variantItem.magentoId ? variantItem.magentoId : null;
    this.magentoSKU = variantItem.magentoSKU ? variantItem.magentoSKU : null;
    this.reference = variantItem.reference;
    this.title = getLangOrFirstAvailableValue(variantItem.title, lang);
    this.shortDescription = variantItem.shortDescription
      ? getLangOrFirstAvailableValue(variantItem.shortDescription, lang)
      : null;
    this.description = variantItem.description
      ? getLangOrFirstAvailableValue(variantItem.description, lang)
      : null;
    this.shippingClass = variantItem.shippingClass;
    this.sku = variantItem.sku;
    this.thumbnail = variantItem.thumbnail;
    this.gallery = variantItem.gallery ? variantItem.gallery : [];
    this.productType = variantItem.productType;
    this.productId = variantItem.productId;
    this.attributeValues = variantItem.attributeValues
      ? variantItem.attributeValues.map(
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
      variantItem.productItems.length > 0
        ? variantItem.productItems.map(
            (itemDetails) => new ProductItemDetailsOutput(itemDetails, lang),
          )
        : [];
    this.categories = variantItem.categories.map(
      (category) => new MiniCategoryOutput(category, lang),
    );
    this.quantity = variantItem.quantity;
    this.salePrice = variantItem.salePrice;
    this.specialPrice = variantItem.specialPrice;
    this.purchaseCost = variantItem.purchaseCost;
    this.stockValue = variantItem.stockValue
      ? variantItem.stockValue
      : DEFAULT_STOCK_VALUE_QUANTITY;
    this.rentPrice = variantItem.rentPrice ? variantItem.rentPrice : null;
    this.canBeSold = variantItem.canBeSold;
    this.canBeRented = variantItem.canBeRented;
    this.canBePackaged = variantItem.canBePackaged;
    this.mustBePackaged = variantItem.mustBePackaged;
    this.createdBy = variantItem.createdBy
      ? new MiniUserOutput(variantItem.createdBy)
      : null;
    this.createdAt = variantItem.createdAt;
    this.lastUpdate = variantItem.lastUpdate;
  }

  id: string;
  magentoId?: number;
  magentoSKU?: string;
  reference: string;
  title: string;
  shortDescription?: string;
  description?: string;
  shippingClass: ShippingClass;
  sku: string;
  thumbnail: Image;
  gallery?: MediaGallery[];
  productType: ProductType;
  productId: string;
  attributeValues: VariantAttributeValueItemOutput[];
  productItems: ProductItemDetailsOutput[];
  categories: MiniCategoryOutput[];
  quantity: ProductQuantity;
  salePrice: number;
  specialPrice?: VoucherItemOutput;
  purchaseCost: number;
  stockValue?: StockValueModel;
  rentPrice?: number;
  canBeSold: boolean;
  canBeRented?: boolean;
  canBePackaged?: boolean;
  mustBePackaged?: boolean;
  createdBy?: MiniUserOutput;
  createdAt: Date;
  lastUpdate: Date;
}
