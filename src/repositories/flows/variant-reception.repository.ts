import { VariantReception } from 'src/domain/entities/flows';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(VariantReception)
export class VariantReceptionRepository extends Repository<VariantReception> {}
