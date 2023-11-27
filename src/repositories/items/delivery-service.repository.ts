import { DeliveryService } from 'src/domain/entities/items';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(DeliveryService)
export class DeliveryServiceRepository extends Repository<DeliveryService> {}
