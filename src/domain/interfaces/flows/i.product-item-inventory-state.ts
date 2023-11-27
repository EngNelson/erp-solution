import { ProductItemInventoryStatus } from 'src/domain/enums/flows';

export interface ProductItemInventoryState {
  barcode: string;
  status: ProductItemInventoryStatus;
}
