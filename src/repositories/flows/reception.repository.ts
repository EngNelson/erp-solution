import { Reception } from 'src/domain/entities/flows';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(Reception)
export class ReceptionRepository extends Repository<Reception> {}
