import { getLangOrFirstAvailableValue, ISOLang } from '@glosuite/shared';
import { Transfert } from 'src/domain/entities/flows';
import { TransfertStatus, TransfertType } from 'src/domain/enums/flows';
import { ExtraMiniStoragePointOutput } from '../warehouses';
import { ExtraMiniOrderOutput } from '../orders';
import { ExtraMiniPurchaseOrderOutput } from '../purchases';

export class MiniTransfertOutput {
  constructor(transfert: Transfert, lang: ISOLang) {
    this.id = transfert.id;
    this.reference = transfert.reference;
    this.type = transfert.type;
    this.status = transfert.status;
    this.description = transfert.description
      ? getLangOrFirstAvailableValue(transfert.description, lang)
      : null;
    // this.isRequest = transfert.isRequest;
    this.source = new ExtraMiniStoragePointOutput(transfert.source);
    this.target = new ExtraMiniStoragePointOutput(transfert.target);
    // this.child = transfert.child
    //   ? new MiniTransfertOutputTransfertOutput(transfert.child, lang)
    //   : null;
    this.order = transfert.order
      ? new ExtraMiniOrderOutput(transfert.order)
      : null;
    this.purchaseOrder = transfert.purchaseOrder
      ? new ExtraMiniPurchaseOrderOutput(transfert.purchaseOrder)
      : null;
    this.createdAt = transfert.createdAt;
    this.validatedAt = transfert.validatedAt ? transfert.validatedAt : null;
  }

  id: string;
  reference: string;
  type: TransfertType;
  status: TransfertStatus;
  description?: string;
  // isRequest: boolean;
  source: ExtraMiniStoragePointOutput;
  target: ExtraMiniStoragePointOutput;
  // child?: MiniTransfertOutputTransfertOutput;
  order?: ExtraMiniOrderOutput;
  purchaseOrder?: ExtraMiniPurchaseOrderOutput;
  createdAt: Date;
  validatedAt?: Date;
}

export class MiniTransfertOutputTransfertOutput {
  constructor(transfert: Transfert, lang: ISOLang) {
    this.id = transfert.id;
    this.reference = transfert.reference;
    this.type = transfert.type;
    this.status = transfert.status;
    this.description = transfert.description
      ? getLangOrFirstAvailableValue(transfert.description, lang)
      : null;
    // this.isRequest = transfert.isRequest;
    this.createdAt = transfert.createdAt;
    this.validatedAt = transfert.validatedAt ? transfert.validatedAt : null;
  }

  id: string;
  reference: string;
  type: TransfertType;
  status: TransfertStatus;
  description?: string;
  // isRequest: boolean;
  createdAt: Date;
  validatedAt?: Date;
}

export class ExtraMiniTransfertOutput {
  constructor(transfert: Transfert) {
    this.id = transfert.id;
    this.reference = transfert.reference;
    this.type = transfert.type;
    this.status = transfert.status;
    this.source = new ExtraMiniStoragePointOutput(transfert.source);
    this.target = new ExtraMiniStoragePointOutput(transfert.target);
  }

  id: string;
  reference: string;
  type: TransfertType;
  status: TransfertStatus;
  source: ExtraMiniStoragePointOutput;
  target: ExtraMiniStoragePointOutput;
}

export class ExtraMiniTransfertOutputForGetOrderById {
  constructor(transfert: Transfert) {
    this.id = transfert.id;
    this.reference = transfert.reference;
  }

  id: string;
  reference: string;
}
