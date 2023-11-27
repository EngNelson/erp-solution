import { AttributeOption } from 'src/domain/entities/items/eav';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(AttributeOption)
export class AttributeOptionRepository extends Repository<AttributeOption> {}
