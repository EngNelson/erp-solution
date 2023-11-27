import { OtherOutput } from 'src/domain/entities/flows';
import { VariantToOutputModel } from './i.variant-to-output.model';

export interface OtherOutputModel {
  otherOutput: OtherOutput;
  variantsToOutput: VariantToOutputModel[];
}
