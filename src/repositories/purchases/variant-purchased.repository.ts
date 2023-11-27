import { VariantPurchased } from 'src/domain/entities/purchases';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(VariantPurchased)
export class VariantPurchasedRepository extends Repository<VariantPurchased> {}
