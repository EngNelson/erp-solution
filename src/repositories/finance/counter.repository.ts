import { Counter } from 'src/domain/entities/finance';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(Counter)
export class CounterRepository extends Repository<Counter> {}
