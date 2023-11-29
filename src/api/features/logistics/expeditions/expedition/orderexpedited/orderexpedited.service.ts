import {
    Injectable,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import {
    UserCon,
  } from '@glosuite/shared';
  import { Expedition } from 'src/domain/entities/logistics';
  import { ExpeditionRepository } from 'src/repositories/orders';
import { OrderExpeditedInput } from './dto';
  
  
  
  @Injectable()
  export class OrderExpeditedService {
    constructor(
      @InjectRepository(Expedition)
      private readonly _expeditionRepository: ExpeditionRepository,
      @InjectRepository(Order)
      private readonly _orderRepository: OrderRepository,
    ) { }
  
    async orderExpedited(
      input: OrderExpeditedInput,
      user: UserCon,
      accessToken: string,
    ): Promise<any> {
  
     return this._expeditionRepository.find();
    }
  
  }
  