import { VariantToOutput } from 'src/domain/entities/flows';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(VariantToOutput)
export class VariantToOutputRepository extends Repository<VariantToOutput> {}
