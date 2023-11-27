import { Supplier } from 'src/domain/entities/purchases';
import { MiniAddressOutput } from '../shared';

export class SupplierItemOutput {
  constructor(supplier: Supplier) {
    this.id = supplier.id;
    this.magentoId = supplier.magentoId ? supplier.magentoId : null;
    this.name = supplier.name;
    this.address = supplier.address
      ? new MiniAddressOutput(supplier.address)
      : null;
  }

  id: string;
  magentoId?: number;
  name: string;
  address?: MiniAddressOutput;
}
