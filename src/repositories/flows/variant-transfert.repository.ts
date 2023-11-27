import { VariantTransfert } from 'src/domain/entities/flows';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(VariantTransfert)
export class VariantTransfertRepository extends Repository<VariantTransfert> {}
