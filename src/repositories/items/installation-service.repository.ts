import { InstallationService } from 'src/domain/entities/items';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(InstallationService)
export class InstallationServiceRepository extends Repository<InstallationService> {}
