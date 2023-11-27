import { ISOLang } from '@glosuite/shared';
import { OperationLineState } from 'src/domain/enums/flows';
import { VariantsToReceivedModel } from 'src/domain/types/flows';
import { MiniProductVariantOutput } from '../items';

export class VariantsToReceivedOutput {
  constructor(receptionModel: VariantsToReceivedModel, lang: ISOLang) {
    this.id = receptionModel.variantReception.id;
    this.quantity = receptionModel.variantReception.quantity;
    this.state = receptionModel.variantReception.state;
    this.position = receptionModel.variantReception.position;
    this.purchaseCost = receptionModel.variantReception.purchaseCost
      ? receptionModel.variantReception.purchaseCost
      : null;
    this.variant = new MiniProductVariantOutput(
      receptionModel.variantDetails,
      lang,
    );
  }

  id: string;
  quantity: number;
  state: OperationLineState;
  position: number;
  purchaseCost?: number;
  variant: MiniProductVariantOutput;
}
