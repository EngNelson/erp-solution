import { OrderExpedited } from "src/domain/entities/logistics";
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(OrderExpedited)
export class  OrderExpeditedRepository extends Repository< OrderExpedited>{}
