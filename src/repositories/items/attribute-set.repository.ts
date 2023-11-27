import { AttributeSet } from 'src/domain/entities/items/eav';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(AttributeSet)
export class AttributeSetRepository extends Repository<AttributeSet> {}
