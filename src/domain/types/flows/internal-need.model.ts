import { InternalNeed } from 'src/domain/entities/flows';
import { VariantNeededModel } from './variant-needed.model';

export type InternalNeedModel = {
  internalNeed: InternalNeed;
  variantNeededs: VariantNeededModel[];
};
