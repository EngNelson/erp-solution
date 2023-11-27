import { Transfert } from 'src/domain/entities/flows';
import { MobileUnitModel } from 'src/domain/interfaces/flows/transfert';
import { VariantsToTransfertModel } from './variants-to-transfert.model';

export type TransfertModel = {
  transfert: Transfert;
  mobileUnits?: MobileUnitModel[];
  variantsToTransfert: VariantsToTransfertModel[];
};
