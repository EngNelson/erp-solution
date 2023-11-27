import { OrderProcessing } from 'src/domain/entities/flows';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(OrderProcessing)
export class OrderProcessingRepository extends Repository<OrderProcessing> {}
