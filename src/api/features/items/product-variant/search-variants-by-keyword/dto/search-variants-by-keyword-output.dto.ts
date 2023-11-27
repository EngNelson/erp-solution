import { getLangOrFirstAvailableValue, Image, ISOLang } from '@glosuite/shared';
import { VariantAttributeValueItemOutput } from 'src/domain/dto/items';
import { MiniAttributeOutput } from 'src/domain/dto/items/eav';
import { VoucherItemOutput } from 'src/domain/dto/orders';
import { MiniCategoryOutput } from 'src/domain/dto/structures';
import { ProductQuantity } from 'src/domain/interfaces';
import { ProductVariantItemDetails } from 'src/domain/types/catalog/items';

export class SearchVariantsByKeywordOutput {
  items: SearchVariantItemOutput[];
  totalItemsCount: number;
  pageIndex: number;
  pageSize: number;

  constructor(
    items: SearchVariantItemOutput[],
    totalItemsCount: number,
    pageIndex: number,
    pageSize: number,
  ) {
    this.items = items;
    this.totalItemsCount = totalItemsCount;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
  }
}

export class SearchVariantItemOutput {
  constructor(variant: Partial<ProductVariantItemDetails>, lang: ISOLang) {
    this.id = variant.id;
    this.magentoSKU = variant.magentoSKU ? variant.magentoSKU : null;
    this.reference = variant.reference;
    this.title = getLangOrFirstAvailableValue(variant.title, lang);
    this.salePrice = variant.salePrice;
    this.specialPrice = variant.specialPrice;
    this.purchaseCost = variant.purchaseCost;
    this.quantity = variant.quantity;
    this.sku = variant.sku;
    this.thumbnail = variant.thumbnail;
    this.categories = variant.categories
      ? variant.categories.map(
          (category) => new MiniCategoryOutput(category, lang),
        )
      : [];
    this.attributeValues = variant.attributeValues.map(
      (attrValue) =>
        new VariantAttributeValueItemOutput(
          attrValue.variantAttributeValue,
          new MiniAttributeOutput(attrValue.attribute, lang),
          attrValue.value,
          attrValue.unit,
          lang,
        ),
    );
    this.createdAt = variant.createdAt;
    this.lastUpdate = variant.lastUpdate;
  }

  id: string;
  magentoSKU?: string;
  reference: string;
  title: string;
  salePrice: number;
  specialPrice?: VoucherItemOutput;
  purchaseCost: number;
  quantity: ProductQuantity;
  sku: string;
  thumbnail: Image;
  categories?: MiniCategoryOutput[];
  attributeValues: VariantAttributeValueItemOutput[];
  createdAt: Date;
  lastUpdate: Date;
}
