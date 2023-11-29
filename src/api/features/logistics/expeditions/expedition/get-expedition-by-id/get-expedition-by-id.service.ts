import {
    Injectable,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import {
    UserCon,
  } from '@glosuite/shared';
  import { Expedition } from 'src/domain/entities/logistics';
  import { ExpeditionRepository } from 'src/repositories/orders';
  import { GetExpeditionInput } from './dto/get-packages-input.dto';
  
  
  
  @Injectable()
  export class GetExpeditionByIdService {
    constructor(
      @InjectRepository(Expedition)
      private readonly _expeditionRepository: ExpeditionRepository,
     
    ) { }
  
    async getExpedition(
      input: GetExpeditionByIdInput,
      user: UserCon,
      accessToken: string,
    ): Promise<any> {
  
     return this._expeditionRepository.find();
    }
  
  }
  