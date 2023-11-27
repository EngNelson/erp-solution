import { PickingList } from 'src/domain/entities/flows';
import { VariantToPickModel } from './i.variant-to-pick.model';

export interface PickingListsOutputModel {
  picking: PickingList;
  variantsToPick: VariantToPickModel[];
}
