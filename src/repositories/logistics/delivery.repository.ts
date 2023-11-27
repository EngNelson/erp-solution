import { Delivery } from "src/domain/entities/logistics";
import { EntityRepository, Repository } from "typeorm";

@EntityRepository(Delivery)
export class DeliveryRepository extends Repository<Delivery>{}