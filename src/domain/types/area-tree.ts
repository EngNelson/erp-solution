import { Area, Location } from '../entities/warehouses';

export type AreaTree = {
  area: Area;
  locationsTree: Location[];
};
