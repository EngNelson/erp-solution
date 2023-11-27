import { Transfert } from 'src/domain/entities/flows';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(Transfert)
export class TransfertRepository extends Repository<Transfert> {}
