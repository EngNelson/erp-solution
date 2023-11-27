import { ISOLang } from '@glosuite/shared';
import { VariantProductItemsOutputModel } from 'src/domain/interfaces/items';
import { ProductItemItemOutput } from '.';
import { MiniProductVariantOutput } from './mini-product-variant-output.dto';

export class VariantProductItemsOutput {
  constructor(variantModel: VariantProductItemsOutputModel, lang: ISOLang) {
    this.productVariant = new MiniProductVariantOutput(
      variantModel.variant,
      lang,
    );
    this.productItems = variantModel.productItems
      ? variantModel.productItems.map(
          (item) => new ProductItemItemOutput(item, lang),
        )
      : [];
  }

  productVariant: MiniProductVariantOutput;
  productItems?: ProductItemItemOutput[];
}
