import { ArticleOrdered } from 'src/domain/entities/orders';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(ArticleOrdered)
export class ArticleOrderedRepository extends Repository<ArticleOrdered> {}
