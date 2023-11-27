import { OtherOutput } from 'src/domain/entities/flows';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(OtherOutput)
export class OtherOutputRepository extends Repository<OtherOutput> {}
