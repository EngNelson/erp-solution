import { getLangOrFirstAvailableValue, ISOLang } from '@glosuite/shared';
import { Product } from 'src/domain/entities/items';
import { ProductType } from 'src/domain/enums/items';

export class MiniProductOutput {
  constructor(product: Product, lang: ISOLang) {
    this.id = product.id;
    this.reference = product.reference;
    this.title = getLangOrFirstAvailableValue(product.title, lang);
    // this.symbol = getLangOrFirstAvailableValue(product.symbol, lang);
    this.productType = product.productType;
  }

  id: string;
  reference: string;
  title: string;
  // symbol: string;
  productType: ProductType;
}
