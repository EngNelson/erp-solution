import { StoragePoint } from 'src/domain/entities/warehouses';
import { StepStatus } from 'src/domain/enums/flows';
import { DeliveryMode, ToBeCashed } from 'src/domain/enums/orders';

export interface UserConFilter {
  orderStatus?: StepStatus[];
  deliveryMode?: DeliveryMode;
  storagePoint?: StoragePoint;
  toBeCashed?: ToBeCashed;
}
