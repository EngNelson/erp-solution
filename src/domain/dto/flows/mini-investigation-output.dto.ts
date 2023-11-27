import { Investigation } from 'src/domain/entities/flows';
import { InvestigationStatus } from 'src/domain/enums/flows';
import { MiniUserOutput } from '../auth';
import { MiniProductItemItemOutput } from '../items';

export class MiniInvestigationOutput {
  constructor(investigation: Investigation) {
    this.id = investigation.id;
    this.reference = investigation.reference;
    this.status = investigation.status;
    this.comment = investigation.comment;
    this.productItem = new MiniProductItemItemOutput(investigation.productItem);
    this.closedAt = investigation.closedAt ? investigation.closedAt : null;
    this.closedBy = investigation.closedBy
      ? new MiniUserOutput(investigation.closedBy)
      : null;
    this.createdAt = investigation.createdAt;
  }

  id: string;
  reference: string;
  status: InvestigationStatus;
  comment: string;
  productItem: MiniProductItemItemOutput;
  closedAt?: Date;
  closedBy?: MiniUserOutput;
  createdAt: Date;
}
