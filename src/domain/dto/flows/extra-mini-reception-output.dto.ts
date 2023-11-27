import { Reception } from 'src/domain/entities/flows';
import { OperationStatus, ReceptionType } from 'src/domain/enums/flows';

export class ExtraMiniReceptionOutput {
  constructor(reception: Reception) {
    this.id = reception.id;
    this.reference = reception.reference;
    this.type = reception.type;
    this.status = reception.status;
  }

  id: string;
  reference: string;
  type: ReceptionType;
  status: OperationStatus;
}
