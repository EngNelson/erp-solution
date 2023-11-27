import { Reception } from 'src/domain/entities/flows';
import { OperationStatus, ReceptionType } from 'src/domain/enums/flows';
import { MiniUserOutput } from '../auth';
import { ExtraMiniStoragePointOutput } from '../warehouses';
import { ExtraMiniOrderOutput } from '../orders';

export class MiniReceptionOutput {
  constructor(reception: Reception) {
    this.id = reception.id;
    this.reference = reception.reference;
    this.type = reception.type;
    this.status = reception.status;
    this.storagePoint = new ExtraMiniStoragePointOutput(reception.storagePoint);
    // this.child = reception.child
    //   ? new ExtraMiniReceptionOutput(reception.child)
    //   : null;
    this.createdBy = reception.createdBy
      ? new MiniUserOutput(reception.createdBy)
      : null;
    this.createdAt = reception.createdAt;
    this.validatedAt = reception.validatedAt ? reception.validatedAt : null;
    this.lastUpdate = reception.lastUpdate;
  }

  id: string;
  reference: string;
  type: ReceptionType;
  status: OperationStatus;
  storagePoint: ExtraMiniStoragePointOutput;
  // child?: ExtraMiniReceptionOutput;
  createdBy?: MiniUserOutput;
  createdAt: Date;
  validatedAt?: Date;
  lastUpdate?: Date;
}

export class MiniReceptionWithOrderOutput {
  constructor(reception: Reception) {
    this.id = reception.id;
    this.reference = reception.reference;
    this.type = reception.type;
    this.status = reception.status;
    this.storagePoint = new ExtraMiniStoragePointOutput(reception.storagePoint);
    this.order = reception.order
      ? new ExtraMiniOrderOutput(reception.order)
      : null;
    // this.child = reception.child
    //   ? new ExtraMiniReceptionOutput(reception.child)
    //   : null;
    this.createdBy = reception.createdBy
      ? new MiniUserOutput(reception.createdBy)
      : null;
    this.createdAt = reception.createdAt;
    this.validatedAt = reception.validatedAt ? reception.validatedAt : null;
    this.lastUpdate = reception.lastUpdate;
  }

  id: string;
  reference: string;
  type: ReceptionType;
  status: OperationStatus;
  storagePoint: ExtraMiniStoragePointOutput;
  order?: ExtraMiniOrderOutput;
  // child?: ExtraMiniReceptionOutput;
  createdBy?: MiniUserOutput;
  createdAt: Date;
  validatedAt?: Date;
  lastUpdate?: Date;
}
