import { PickingList } from 'src/domain/entities/flows';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(PickingList)
export class PickingListRepository extends Repository<PickingList> {}
