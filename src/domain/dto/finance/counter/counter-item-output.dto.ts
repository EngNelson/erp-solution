import { Counter } from 'src/domain/entities/finance';
import { MiniUserOutput } from '../../auth';
import { ExtraMiniStoragePointOutput } from '../../warehouses';
import { AmountByMethod, CashedAlert } from 'src/domain/interfaces/finance';
export class CounterItemOutput {
  constructor(counter: Counter) {
    this.id = counter.id;
    this.reference = counter.reference;
    this.amountExpected = counter.amountExpected;
    this.amountCollected = counter.amountCollected;
    this.amountsByMethod = counter.amountsByMethod;
    this.alert = counter.alert;
    this.cashier = new MiniUserOutput(counter.createdBy);
    this.storagePoint = counter.storagePoint
      ? new ExtraMiniStoragePointOutput(counter.storagePoint)
      : null;
    this.createdAt = counter.createdAt;
  }

  id: string;
  reference: string;
  amountExpected: number;
  amountCollected: number;
  amountsByMethod: AmountByMethod[];
  alert?: CashedAlert;
  cashier: MiniUserOutput;
  storagePoint?: ExtraMiniStoragePointOutput;
  createdAt: Date;
}
