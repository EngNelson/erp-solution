import { CustomerReturn } from 'src/domain/entities/flows';
import {
  CustomerReturnState,
  CustomerReturnStatus,
} from 'src/domain/enums/flows';
import { MiniUserOutput } from '../auth';

export class MiniCustomerReturnOutput {
  constructor(customerReturn: CustomerReturn) {
    this.id = customerReturn.id;
    this.reference = customerReturn.reference;
    this.status = customerReturn.status;
    this.state = customerReturn.state;
    this.createdAt = customerReturn.createdAt;
    this.lastUpdate = customerReturn.lastUpdate;
    this.createdBy = new MiniUserOutput(customerReturn.createdBy);
  }

  id: string;
  reference: string;
  status: CustomerReturnStatus;
  state: CustomerReturnState;
  createdAt: Date;
  lastUpdate?: Date;
  createdBy: MiniUserOutput;
}
