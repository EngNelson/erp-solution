import { ISOLang } from '@glosuite/shared';
import { ProductItem } from 'src/domain/entities/items';
import { ProductVariantItemDetails } from 'src/domain/types/catalog/items';
import {
  MiniProductVariantOutput,
  ProductItemToBeStoreItemOutput,
} from '../items';

export class ProductToBeStoredOutput {
  constructor(
    variant: Partial<ProductVariantItemDetails>,
    productItems: ProductItem[],
    quantity: number,
    lang: ISOLang,
  ) {
    this.variant = new MiniProductVariantOutput(variant, lang);
    this.productItems = productItems.map(
      (productItem) =>
        new ProductItemToBeStoreItemOutput(productItem, variant, lang),
    );
    this.quantity = quantity;
  }

  variant: MiniProductVariantOutput;
  productItems: ProductItemToBeStoreItemOutput[];
  quantity: number;
}
