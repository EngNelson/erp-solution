import { getLangOrFirstAvailableValue, ISOLang } from '@glosuite/shared';
import { Product } from 'src/domain/entities/items';

export class RestoreProductsOutput {
  items: RestoreProductsOutputItem[];
  totalItemsRestored: number;

  constructor(items: RestoreProductsOutputItem[], totalItemsRestored: number) {
    this.items = items;
    this.totalItemsRestored = totalItemsRestored;
  }
}

export class RestoreProductsOutputItem {
  constructor(product: Product, lang: ISOLang) {
    this.id = product.id;
    this.title = getLangOrFirstAvailableValue(product.title, lang);
  }

  id: string;
  title: string;
}
