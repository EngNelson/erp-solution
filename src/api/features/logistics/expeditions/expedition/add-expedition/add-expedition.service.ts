import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ISOLang,
  PaginationDto,
  UserCon,
} from '@glosuite/shared';
import {  Expedition } from 'src/domain/entities/logistics';
import { ExpeditionRepository } from 'src/repositories/logistics';

import { AddExpeditionInput } from './dto'
import { Repository } from 'typeorm';

type ValidationResult = {
  pagination: PaginationDto;
  option?: any;
  lang?: ISOLang;
  user: UserCon;
};

@Injectable()
export class AddExpeditionService {

  constructor(
    @InjectRepository(Expedition)
    private readonly _expeditionRepository: Repository<ExpeditionRepository>,
  ){}
    

  async addExpedition(input: AddExpeditionInput,
    user: UserCon, accessToken: string ) {

    try {
           
      const response = await this._expeditionRepository.save(input);

    } catch (error) {
      throw new HttpException("Adding new expedition failed", HttpStatus.EXPECTATION_FAILED);
    }

  }

}