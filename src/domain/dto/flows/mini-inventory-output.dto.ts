import { getLangOrFirstAvailableValue, ISOLang } from '@glosuite/shared';
import { Inventory } from 'src/domain/entities/flows';
import { OperationStatus } from 'src/domain/enums/flows';
import { MiniLocationOutput } from '../warehouses';

export class MiniInventoryOutput {
  constructor(inventory: Inventory, lang: ISOLang) {
    this.id = inventory.id;
    this.reference = inventory.reference;
    this.title = getLangOrFirstAvailableValue(inventory.title, lang);
    this.status = inventory.status;
    this.location = new MiniLocationOutput(inventory.location, lang);
    this.createdAt = inventory.createdAt;
  }

  id: string;
  reference: string;
  title: string;
  status: OperationStatus;
  location: MiniLocationOutput;
  createdAt: Date;
}
