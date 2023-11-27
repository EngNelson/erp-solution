import { TString } from '@glosuite/shared';
import { Area, Location } from '../entities/warehouses';

export type NewLocationMapping = {
  name: string;
  description?: TString;
  parentLocation?: Location;
  area?: Area;
  isParentLocation: boolean;
  isArea: boolean;
};
