import { DbBaseEntity } from '@glosuite/shared';
import { Column, Entity } from 'typeorm';

@Entity('article-composition')
export class ArticleComposition extends DbBaseEntity {
  @Column()
  required: boolean;

  @Column()
  salePrice: number;
}
