import { InventoryState } from 'src/domain/entities/flows';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(InventoryState)
export class InventoryStateRepository extends Repository<InventoryState> {}
