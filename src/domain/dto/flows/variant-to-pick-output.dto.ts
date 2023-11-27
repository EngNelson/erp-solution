import { ISOLang } from '@glosuite/shared';
import { Location } from 'src/domain/entities/warehouses';
import { ProductVariantItemDetails } from 'src/domain/types/catalog/items';
import { MiniProductVariantOutput } from '../items';
import { MiniLocationOutput } from '../warehouses';

export class VariantToPickOutput {
  constructor(
    variant: Partial<ProductVariantItemDetails>,
    quantityToPick: number,
    locations: Location[],
    lang: ISOLang,
  ) {
    this.variantToPick = new MiniProductVariantOutput(variant, lang);
    this.quantityToPick = quantityToPick;
    this.locations = locations.map(
      (location) => new MiniLocationOutput(location, lang),
    );
  }

  variantToPick: MiniProductVariantOutput;
  quantityToPick: number;
  locations: MiniLocationOutput[];
}
