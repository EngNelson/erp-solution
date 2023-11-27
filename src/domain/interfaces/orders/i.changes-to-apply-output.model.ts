import { MiniOrderOutput } from 'src/domain/dto/orders';
import {
  OrderChangesAppliedStatus,
  OrderSensitivesData,
} from 'src/domain/enums/orders';
import { MiniUserPayload } from '../i.mini-user-payload';

export interface ChangesToApplyOutputModel {
  position: number;
  status: OrderChangesAppliedStatus;
  dataChanged: OrderSensitivesData;
  previousVersion: MiniOrderOutput;
  changedBy: MiniUserPayload;
  changedAt: Date;
  appliedBy?: MiniUserPayload;
  appliedAt?: Date;
}

export interface MiniChangesToApplyOutputModel {
  position: number;
  status: OrderChangesAppliedStatus;
  dataChanged: OrderSensitivesData;
  changedBy: MiniUserPayload;
  changedAt: Date;
  appliedBy?: MiniUserPayload;
  appliedAt?: Date;
}
