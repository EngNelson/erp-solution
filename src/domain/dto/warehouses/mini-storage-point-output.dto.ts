import { StoragePoint } from 'src/domain/entities/warehouses';
import { MiniUserOutput } from '../auth';
import { MiniAddressOutput } from '../shared';

export class MiniStoragePointOutput {
  constructor(storagePoint: StoragePoint) {
    this.id = storagePoint.id;
    this.name = storagePoint.name;
    this.address = new MiniAddressOutput(storagePoint.address);
    this.createdBy = storagePoint.createdBy
      ? new MiniUserOutput(storagePoint.createdBy)
      : null;
  }

  id: string;
  name: string;
  address: MiniAddressOutput;
  createdBy?: MiniUserOutput;
}

export class ExtraMiniStoragePointOutput {
  constructor(storagePoint: StoragePoint) {
    this.id = storagePoint.id;
    this.name = storagePoint.name;
  }

  id: string;
  name: string;
}
