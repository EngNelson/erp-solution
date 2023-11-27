import { ISOLang } from '@glosuite/shared';
import { MiniUserOutput } from 'src/domain/dto/auth';
import {
  ExtraMiniTransfertOutput,
  MiniInternalNeedOutput,
  ProductToBeStoredOutput,
} from 'src/domain/dto/flows';
import { MiniOrderOutput } from 'src/domain/dto/orders';
import { MiniPurchaseOrderOutput } from 'src/domain/dto/purchases';
import { ExtraMiniStoragePointOutput } from 'src/domain/dto/warehouses';
import { Reception, Transfert } from 'src/domain/entities/flows';
import { OperationStatus, ReceptionType } from 'src/domain/enums/flows';
import { ProductToBeStoredModel } from 'src/domain/interfaces/flows';

export class GetReceptionToBeStoredByIdOutput {
  constructor(
    reception: Reception,
    productsToBeStored: ProductToBeStoredModel[],
    lang: ISOLang,
    transfert?: Transfert,
  ) {
    this.id = reception.id;
    this.reference = reception.reference;
    this.type = reception.type;
    this.status = reception.status;
    this.storagePoint = new ExtraMiniStoragePointOutput(reception.storagePoint);
    this.purchaseOrder = reception.purchaseOrder
      ? new MiniPurchaseOrderOutput(reception.purchaseOrder, lang)
      : null;

    this.order = reception.purchaseOrder?.order
      ? new MiniOrderOutput(reception.purchaseOrder.order)
      : null;
    this.orderRef = reception.purchaseOrder?.orderRef
      ? reception.purchaseOrder.orderRef
      : null;
    this.transfert = transfert ? new ExtraMiniTransfertOutput(transfert) : null;
    this.internalNeed = reception.purchaseOrder?.internalNeed
      ? new MiniInternalNeedOutput(reception.purchaseOrder.internalNeed)
      : null;
    this.productsToStored = productsToBeStored.map(
      (productToBeStored) =>
        new ProductToBeStoredOutput(
          productToBeStored.variant,
          productToBeStored.productItems,
          productToBeStored.quantity,
          lang,
        ),
    );
    this.validatedBy = reception.validatedBy
      ? new MiniUserOutput(reception.validatedBy)
      : null;
    this.validetedAt = reception.lastUpdate;
  }

  id: string;
  reference: string;
  type: ReceptionType;
  status: OperationStatus;
  storagePoint: ExtraMiniStoragePointOutput;
  purchaseOrder?: MiniPurchaseOrderOutput;
  order?: MiniOrderOutput;
  orderRef?: string;
  transfert?: ExtraMiniTransfertOutput;
  internalNeed?: MiniInternalNeedOutput;
  productsToStored: ProductToBeStoredOutput[];
  validatedBy?: MiniUserOutput;
  validetedAt: Date;
}
