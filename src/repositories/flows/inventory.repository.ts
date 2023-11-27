import { Inventory } from 'src/domain/entities/flows';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(Inventory)
export class InventoryRepository extends Repository<Inventory> {}
