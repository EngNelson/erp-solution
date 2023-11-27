import { WarrantyService } from 'src/domain/entities/items';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(WarrantyService)
export class WarrantyServiceRepository extends Repository<WarrantyService> {}
