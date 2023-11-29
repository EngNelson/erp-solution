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
import {  Expedition, Packages } from 'src/domain/entities/logistics';
import { ExpeditionRepository, PackagesRepository } from 'src/repositories/logistics';
import { GetDeliveriesOptionsDto } from 'src/domain/dto/delivery/get-deliveries-options.dto';

import { AddExpeditionInput } from './dto'
import { Repository } from 'typeorm';
import { Reception } from 'src/domain/entities/flows';
import { ReceptionRepository } from 'src/repositories/flows/reception.repository';
import { ProductItem } from 'src/domain/entities/items';
import { ProductItemRepository } from 'src/repositories/items';

type ValidationResult = {
  pagination: PaginationDto;
  option?: GetDeliveriesOptionsDto;
  lang?: ISOLang;
  user: UserCon;
};

@Injectable()
export class AddPackagesService {

  constructor(
    @InjectRepository(Packages)
    private readonly _packagesRepository: Repository<PackagesRepository>,
    @InjectRepository(Reception)
    private readonly _receptionRepository: Repository<ReceptionRepository>,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: Repository<ProductItemRepository>,

    @InjectRepository(Packages)
    private readonly _packagesPointRepository: Repository<PackagesRepository>,

    @InjectRepository(Expedition)
    private readonly _expeditionRepository: Repository<ExpeditionRepository>,
  ) { }

  async addPackages(input: AddExpeditionInput,
    user: UserCon, accessToken: string ) {

    try {
           
      const response = await this._packagesRepository.save(input);

    } catch (error) {
      throw new HttpException("Adding new Package failed", HttpStatus.EXPECTATION_FAILED);
    }

  }

}