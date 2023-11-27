import { Attribute } from 'src/domain/entities/items/eav';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(Attribute)
export class AttributeRepository extends Repository<Attribute> {}
