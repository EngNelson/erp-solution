import { Location } from '../entities/warehouses';
import { NewLocationMapping } from './new-location.mapping';

export type MergeLocationsMapping = {
  sourceLocation: Location;
  targetLocation?: Location;
  isNewLocation: boolean;
  newLocationInput?: NewLocationMapping;
};
