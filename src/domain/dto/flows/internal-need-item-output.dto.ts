import { CompanyService, Department, ISOLang } from '@glosuite/shared';
import { InternalNeedUsage, InternalNeedStatus } from 'src/domain/enums/flows';
import { Employee } from 'src/domain/interfaces';
import { InternalNeedModel } from 'src/domain/types/flows';
import { MiniUserOutput } from '../auth';
import { MiniPurchaseOrderOutput } from '../purchases';
import { ExtraMiniStoragePointOutput } from '../warehouses';
import { VariantNeededOutput } from './variant-needed-output.dto';

export class InternalNeedItemOutput {
  constructor(internalNeedModel: InternalNeedModel, lang: ISOLang) {
    this.id = internalNeedModel.internalNeed.id;
    this.reference = internalNeedModel.internalNeed.reference;
    this.usage = internalNeedModel.internalNeed.usage;
    this.service = internalNeedModel.internalNeed.service
      ? internalNeedModel.internalNeed.service
      : null;
    this.department = internalNeedModel.internalNeed.department
      ? internalNeedModel.internalNeed.department
      : null;
    this.employee = internalNeedModel.internalNeed.employee
      ? internalNeedModel.internalNeed.employee
      : null;
    this.addressTo = new MiniUserOutput(
      internalNeedModel.internalNeed.addressTo,
    );
    this.reason = internalNeedModel.internalNeed.reason;
    this.response = internalNeedModel.internalNeed.response
      ? internalNeedModel.internalNeed.response
      : null;
    this.status = internalNeedModel.internalNeed.status;
    this.variantNeededs = internalNeedModel.variantNeededs.map(
      (variantNeeded) => new VariantNeededOutput(variantNeeded, lang),
    );
    this.storagePoint = internalNeedModel.internalNeed.storagePoint
      ? new ExtraMiniStoragePointOutput(
          internalNeedModel.internalNeed.storagePoint,
        )
      : null;
    this.purchaseOrder = internalNeedModel.internalNeed.purchaseOrder
      ? new MiniPurchaseOrderOutput(
          internalNeedModel.internalNeed.purchaseOrder,
          lang,
        )
      : null;
    // this.pickingList = internalNeedModel.internalNeed.pickingList
    //   ? new MiniPickingListOutput(internalNeedModel.internalNeed.pickingList)
    //   : null;
    this.totalValue = internalNeedModel.internalNeed.totalValue;
    this.createdAt = internalNeedModel.internalNeed.createdAt;
    this.lastUpdate = internalNeedModel.internalNeed.lastUpdate
      ? internalNeedModel.internalNeed.lastUpdate
      : null;
    this.createdBy = internalNeedModel.internalNeed.createdBy
      ? new MiniUserOutput(internalNeedModel.internalNeed.createdBy)
      : null;
    this.rejectedBy = internalNeedModel.internalNeed.rejectedBy
      ? new MiniUserOutput(internalNeedModel.internalNeed.rejectedBy)
      : null;
    this.rejectedAt = internalNeedModel.internalNeed.rejectedAt
      ? internalNeedModel.internalNeed.rejectedAt
      : null;
    this.validatedBy = internalNeedModel.internalNeed.validatedBy
      ? new MiniUserOutput(internalNeedModel.internalNeed.validatedBy)
      : null;
    this.validatedAt = internalNeedModel.internalNeed.validatedAt
      ? internalNeedModel.internalNeed.validatedAt
      : null;
    this.canceledBy = internalNeedModel.internalNeed.canceledBy
      ? new MiniUserOutput(internalNeedModel.internalNeed.canceledBy)
      : null;
    this.canceledAt = internalNeedModel.internalNeed.canceledAt
      ? internalNeedModel.internalNeed.canceledAt
      : null;
  }

  id: string;
  reference: string;
  usage: InternalNeedUsage;
  service?: CompanyService;
  department?: Department;
  employee?: Employee;
  addressTo: MiniUserOutput;
  reason: string;
  response?: string;
  status: InternalNeedStatus;
  variantNeededs: VariantNeededOutput[];
  storagePoint?: ExtraMiniStoragePointOutput;
  purchaseOrder?: MiniPurchaseOrderOutput;
  // pickingList?: MiniPickingListOutput;
  totalValue: number;
  createdAt: Date;
  lastUpdate?: Date;
  createdBy?: MiniUserOutput;
  rejectedBy?: MiniUserOutput;
  rejectedAt?: Date;
  validatedBy?: MiniUserOutput;
  validatedAt?: Date;
  canceledBy?: MiniUserOutput;
  canceledAt?: Date;
}
