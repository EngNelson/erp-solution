import { PurchaseOrder } from 'src/domain/entities/purchases';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(PurchaseOrder)
export class PurchaseOrderRepository extends Repository<PurchaseOrder> {}
