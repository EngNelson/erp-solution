import { ChildEntity } from 'typeorm';
import { Service } from './service.entity';

@ChildEntity()
export class DeliveryService extends Service {}
