import { getLangOrFirstAvailableValue, Image, ISOLang } from '@glosuite/shared';
import { ProductItem } from 'src/domain/entities/items';
import { StepStatus } from 'src/domain/enums/flows';
import { ItemState } from 'src/domain/enums/items';
import { ShippingClass } from 'src/domain/enums/orders';
import { ProductVariantItemDetails } from 'src/domain/types/catalog/items';
import { SupplierItemOutput } from '../purchases';
import { ExtraMiniLocationOutput, MiniLocationOutput } from '../warehouses';

export class ProductItemItemOutput {
  constructor(productItem: ProductItem, lang: ISOLang) {
    this.id = productItem.id;
    this.reference = productItem.reference;
    this.barCode = productItem.barcode;
    this.purchaseCost = productItem.purchaseCost;
    this.title = getLangOrFirstAvailableValue(
      productItem.productVariant.title,
      lang,
    );
    this.sku = productItem.productVariant.sku;
    this.imei = productItem.imei ? productItem.imei : null;
    this.thumbnail = productItem.productVariant.thumbnail
      ? productItem.productVariant.thumbnail
      : null;
    this.shippingClass = productItem.productVariant.shippingClass;
    this.state = productItem.state;
    this.status = productItem.status;
    this.productVariantId = productItem.productVariantId;
    this.location = productItem.location
      ? new ExtraMiniLocationOutput(productItem.location)
      : null;
    this.cost = productItem.purchaseCost ? productItem.purchaseCost : null;
    this.supplier = productItem.supplier
      ? new SupplierItemOutput(productItem.supplier)
      : null;
    this.createdAt = productItem.createdAt;
  }

  id: string;
  reference: string;
  barCode: string;
  title: string;
  sku: string;
  imei?: string;
  thumbnail?: Image;
  purchaseCost: number;
  shippingClass: ShippingClass;
  state: ItemState;
  status: StepStatus;
  productVariantId: string;
  location: ExtraMiniLocationOutput;
  cost?: number;
  supplier?: SupplierItemOutput;
  createdAt: Date;
}

export class ProductItemToBeStoreItemOutput {
  constructor(
    productItem: ProductItem,
    variant: Partial<ProductVariantItemDetails>,
    lang: ISOLang,
  ) {
    this.id = productItem.id;
    this.reference = productItem.reference;
    this.barCode = productItem.barcode;
    this.purchaseCost = productItem.purchaseCost;
    this.title = getLangOrFirstAvailableValue(variant.title, lang);
    this.imei = productItem.imei ? productItem.imei : null;
    this.thumbnail = variant.thumbnail ? variant.thumbnail : null;
    this.shippingClass = variant.shippingClass;
    this.state = productItem.state;
    this.status = productItem.status;
    this.productVariantId = productItem.productVariantId;
    this.location = productItem.location
      ? new MiniLocationOutput(productItem.location, lang)
      : null;
    this.cost = productItem.purchaseCost ? productItem.purchaseCost : null;
    this.supplier = productItem.supplier
      ? new SupplierItemOutput(productItem.supplier)
      : null;
    this.createdAt = productItem.createdAt;
  }

  id: string;
  reference: string;
  barCode: string;
  title: string;
  imei?: string;
  thumbnail?: Image;
  purchaseCost: number;
  shippingClass: ShippingClass;
  state: ItemState;
  status: StepStatus;
  productVariantId: string;
  location: MiniLocationOutput;
  cost?: number;
  supplier?: SupplierItemOutput;
  createdAt: Date;
}

export class ProductItemInMobileUnitItemOutput {
  constructor(productItem: ProductItem, lang: ISOLang) {
    this.variantId = productItem.productVariantId;
    this.barCode = productItem.barcode;
    this.title = getLangOrFirstAvailableValue(
      productItem.productVariant.title,
      lang,
    );
    this.imei = productItem.imei ? productItem.imei : null;
    this.thumbnail = productItem.productVariant.thumbnail
      ? productItem.productVariant.thumbnail
      : null;
  }

  variantId: string;
  barCode: string;
  title: string;
  imei?: string;
  thumbnail?: Image;
}

export class ExtraMiniProductItemOutput {
  constructor(productItem: ProductItem) {
    this.variantId = productItem.productVariantId;
    this.barCode = productItem.barcode;
    this.imei = productItem.imei ? productItem.imei : null;
  }

  variantId: string;
  barCode: string;
  imei?: string;
}
