import { getLangOrFirstAvailableValue, Image, ISOLang } from '@glosuite/shared';
import { ProductVariant } from 'src/domain/entities/items';

export class ExtraMiniProductVariantOutput {
  constructor(variant: ProductVariant, lang: ISOLang) {
    this.id = variant.id;
    this.reference = variant.reference;
    this.sku = variant.sku;
    this.title = getLangOrFirstAvailableValue(variant.title, lang);
    this.thumbnail = variant.thumbnail;
  }

  id: string;
  reference: string;
  sku: string;
  title: string;
  thumbnail?: Image;
}
