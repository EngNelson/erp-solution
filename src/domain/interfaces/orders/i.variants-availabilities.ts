import { AvailabilityStatus } from 'src/domain/enums/orders';
import { VariantAvailability } from '.';

export interface VariantsAvailabilities {
  status: AvailabilityStatus;
  availabilities: VariantAvailability[];
}
