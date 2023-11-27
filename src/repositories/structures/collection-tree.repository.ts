import { Collection } from 'src/domain/entities/structures';
import { EntityRepository, TreeRepository } from 'typeorm';

@EntityRepository(Collection)
export class CollectionTreeRepository extends TreeRepository<Collection> {}
