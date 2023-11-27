import { Supplier } from 'src/domain/entities/purchases';

export interface LastSupplier {
  supplier?: Supplier;
  purchaseCost?: number;
}
