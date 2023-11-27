import { CancelReasonModel } from './i.cancel-reason.model';

export interface CancelReasonItem {
  code: string;
  label: string;
  parent: CancelReasonModel;
}
