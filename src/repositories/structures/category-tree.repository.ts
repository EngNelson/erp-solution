import { Category } from 'src/domain/entities/structures';
import { EntityRepository, TreeRepository } from 'typeorm';

@EntityRepository(Category)
export class CategoryTreeRepository extends TreeRepository<Category> {}
