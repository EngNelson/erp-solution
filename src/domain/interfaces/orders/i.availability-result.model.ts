import { AvailabilityStatus } from 'src/domain/enums/orders';

export interface AvailabilityResultModel {
  status: AvailabilityStatus;
  remainingItems: number;
}
