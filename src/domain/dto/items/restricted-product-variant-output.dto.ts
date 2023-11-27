import { getLangOrFirstAvailableValue, Image, ISOLang } from '@glosuite/shared';
import { ProductVariant } from 'src/domain/entities/items';

export class RestrictedProductVariantOutput {
  constructor(variant: ProductVariant, lang: ISOLang) {
    this.id = variant.id;
    this.reference = variant.reference;
    this.sku = variant.sku;
    this.title = getLangOrFirstAvailableValue(variant.title, lang);
    this.description = variant.description
      ? getLangOrFirstAvailableValue(variant.description, lang)
      : null;
    this.thumbnail = variant.thumbnail ? variant.thumbnail : null;
  }

  id: string;
  reference: string;
  sku: string;
  title: string;
  description?: string;
  thumbnail?: Image;
}
