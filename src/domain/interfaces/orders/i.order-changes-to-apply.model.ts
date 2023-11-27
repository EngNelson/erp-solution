import {
  OrderChangesAppliedStatus,
  OrderSensitivesData,
} from 'src/domain/enums/orders';
import { MiniUserPayload } from '../i.mini-user-payload';

export interface OrderChangesToApplyModel {
  position: number;
  status: OrderChangesAppliedStatus;
  dataChanged: OrderSensitivesData;
  previousVersionId: string;
  changedBy: MiniUserPayload;
  changedAt: Date;
  appliedBy?: MiniUserPayload;
  appliedAt?: Date;
}
