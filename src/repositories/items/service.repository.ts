import { Service } from 'src/domain/entities/items';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(Service)
export class ServiceRepository extends Repository<Service> {}
