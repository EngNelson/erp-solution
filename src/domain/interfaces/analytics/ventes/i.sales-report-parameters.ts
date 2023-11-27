import { StoragePoint } from 'src/domain/entities/warehouses';
import { DeliveryHub } from 'src/domain/enums/orders/e.delivery-hub';
import { MiniUserPayload } from '../../i.mini-user-payload';

export interface SalesReportParameters {
  storagePoint?: StoragePoint;
  agent?: MiniUserPayload;
  hub?: DeliveryHub;
  startDate?: Date;
  endDate?: Date;
  specificDate?: Date;
}
