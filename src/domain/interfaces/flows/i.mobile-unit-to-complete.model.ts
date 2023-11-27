import { MobileUnit } from 'src/domain/entities/flows';
import { ProductItem } from 'src/domain/entities/items';

export interface MobileUnitsToCompleteModel {
  mobileUnit: MobileUnit;
  receivedItems: ProductItem[];
}
