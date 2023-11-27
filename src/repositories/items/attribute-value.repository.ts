import { AttributeValue } from 'src/domain/entities/items/eav';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(AttributeValue)
export class AttributeValueRepository extends Repository<AttributeValue> {}
