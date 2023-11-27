import { Expedition } from "src/domain/entities/logistics";
import { EntityRepository, Repository } from "typeorm";

@EntityRepository(Expedition)
export class ExpeditionRepository extends Repository<Expedition>{}