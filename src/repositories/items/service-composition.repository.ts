import { ServiceComposition } from 'src/domain/entities/items';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(ServiceComposition)
export class ServiceCompositionRepository extends Repository<ServiceComposition> {}
