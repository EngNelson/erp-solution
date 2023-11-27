import { Reception, Transfert } from 'src/domain/entities/flows';
import { MobileUnitModel } from 'src/domain/interfaces/flows/transfert';
import { VariantsToReceivedModel } from './variants-to-received.model';

export type ReceptionModel = {
  reception: Reception;
  mobileUnits?: MobileUnitModel[];
  variantsToReceived?: VariantsToReceivedModel[];
  transfert?: Transfert;
};
