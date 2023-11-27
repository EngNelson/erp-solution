import { Voucher } from 'src/domain/entities/orders';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(Voucher)
export class VoucherRepository extends Repository<Voucher> {}
