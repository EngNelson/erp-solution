import { Collection } from 'src/domain/entities/structures';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(Collection)
export class CollectionRepository extends Repository<Collection> {}
