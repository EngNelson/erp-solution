import { StockMovement } from 'src/domain/entities/flows';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(StockMovement)
export class StockMovementRepository extends Repository<StockMovement> {}
