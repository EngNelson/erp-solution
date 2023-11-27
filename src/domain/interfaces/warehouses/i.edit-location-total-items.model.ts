import { Location } from 'src/domain/entities/warehouses';
import { UpdatedType } from 'src/domain/enums/warehouses';

export interface EditLocationTotalItemsModel {
  location: Location;
  quantity: number;
  type: UpdatedType;
}
