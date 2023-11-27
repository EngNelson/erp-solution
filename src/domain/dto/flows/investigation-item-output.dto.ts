import { ISOLang } from '@glosuite/shared';
import { Investigation } from 'src/domain/entities/flows';
import { InvestigationStatus } from 'src/domain/enums/flows';
import { MiniInventoryOutput } from '.';
import { MiniUserOutput } from '../auth';
import { ProductItemItemOutput } from '../items';

export class InvestigationItemOutput {
  constructor(investigation: Investigation, lang: ISOLang) {
    this.id = investigation.id;
    this.reference = investigation.reference;
    this.status = investigation.status;
    this.comment = investigation.comment ? investigation.comment : null;
    this.inventory = new MiniInventoryOutput(investigation.inventory, lang);
    this.productItem = new ProductItemItemOutput(
      investigation.productItem,
      lang,
    );
    this.createdAt = investigation.createdAt;
    this.closedBy = investigation.closedBy
      ? new MiniUserOutput(investigation.closedBy)
      : null;
    this.closedAt = investigation.closedAt ? investigation.closedAt : null;
    this.lastUpdate = investigation.lastUpdate
      ? investigation.lastUpdate
      : null;
  }

  id: string;
  reference: string;
  status: InvestigationStatus;
  comment?: string;
  inventory: MiniInventoryOutput;
  productItem: ProductItemItemOutput;
  createdAt: Date;
  closedBy?: MiniUserOutput;
  closedAt?: Date;
  lastUpdate?: Date;
}
