import { DeliveryPoint } from "src/domain/entities/logistics/delivery-point.entity";
import { EntityRepository, Repository } from "typeorm";

@EntityRepository(DeliveryPoint)
export class DeliveryPointRepository extends Repository<DeliveryPoint>{}