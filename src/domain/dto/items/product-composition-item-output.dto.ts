import { ISOLang } from '@glosuite/shared';
import { ProductComposition } from 'src/domain/entities/items';
import { MiniProductOutput } from './mini-product-output.dto';

export class ProductCompositionItemOutput {
  constructor(productComposition: ProductComposition, lang: ISOLang) {
    this.child = new MiniProductOutput(productComposition.child, lang);
    this.required = productComposition.required;
    this.defaultQuantity = productComposition.defaultQuantity;
    this.position = productComposition.position;
  }

  child: MiniProductOutput;
  required: boolean;
  defaultQuantity: number;
  position?: number;
}
