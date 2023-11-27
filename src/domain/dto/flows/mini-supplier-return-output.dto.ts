import { SupplierReturn } from 'src/domain/entities/flows';
import { OperationStatus, SupplierReturnType } from 'src/domain/enums/flows';

export class MiniSupplierReturnOutput {
  constructor(supplierReturn: SupplierReturn) {
    this.id = supplierReturn.id;
    this.reference = supplierReturn.reference;
    this.type = supplierReturn.type;
    this.status = supplierReturn.status;
    this.createdAt = supplierReturn.createdAt;
  }

  id: string;
  reference: string;
  type: SupplierReturnType;
  status: OperationStatus;
  createdAt: Date;
}
