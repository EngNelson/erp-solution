import { getLangOrFirstAvailableValue, ISOLang } from '@glosuite/shared';
import { Product } from 'src/domain/entities/items';
import { ProductType } from 'src/domain/enums/items';
import { ProductQuantity } from 'src/domain/interfaces';

export class SearchProductsByKeywordOutput {
  items: SearchProductItemOutput[];
  totalItemsCount: number;
  pageIndex: number;
  pageSize: number;

  constructor(
    items: SearchProductItemOutput[],
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

export class SearchProductItemOutput {
  constructor(product: Product, lang: ISOLang) {
    this.id = product.id;
    this.reference = product.reference;
    this.title = getLangOrFirstAvailableValue(product.title, lang);
    this.sku = product.sku;
    this.productType = product.productType;
    this.countVariants = product.productVariants
      ? product.productVariants.length
      : 0;
    this.quantity = product.quantity;
    this.createdAt = product.createdAt;
    this.lastUpdate = product.lastUpdate;
  }

  id: string;
  reference: string;
  title: string;
  sku: string;
  productType: ProductType;
  countVariants: number;
  quantity: ProductQuantity;
  createdAt: Date;
  lastUpdate: Date;
}
