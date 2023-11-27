import { ExtraPackaging } from 'src/domain/entities/items';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(ExtraPackaging)
export class ExtraPackagingRepository extends Repository<ExtraPackaging> {}
