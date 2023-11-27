import { InternalNeed } from 'src/domain/entities/flows';
import { InternalNeedStatus, InternalNeedUsage } from 'src/domain/enums/flows';

export class MiniInternalNeedOutput {
  constructor(internalNeed: InternalNeed) {
    this.id = internalNeed.id;
    this.reference = internalNeed.reference;
    this.usage = internalNeed.usage;
    // this.service = internalNeed.service ? internalNeed.service : null;
    // this.department = internalNeed.department ? internalNeed.department : null;
    // this.employee = internalNeed.employee ? internalNeed.employee : null;
    // this.reason = internalNeed.reason;
    this.status = internalNeed.status;
    this.totalValue = internalNeed.totalValue;
    this.createdAt = internalNeed.createdAt;
    this.lastUpdate = internalNeed.lastUpdate ? internalNeed.lastUpdate : null;
  }

  id: string;
  reference: string;
  usage: InternalNeedUsage;
  // service?: CompanyService;
  // department?: Department;
  // employee?: Employee;
  // reason: string;
  status: InternalNeedStatus;
  totalValue: number;
  createdAt: Date;
  lastUpdate?: Date;
}

export class ExtraMiniInternalNeedOutput {
  constructor(internalNeed: InternalNeed) {
    this.id = internalNeed.id;
    this.reference = internalNeed.reference;
  }

  id: string;
  reference: string;
}
