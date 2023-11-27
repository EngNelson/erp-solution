import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { InvestigationItemOutput } from 'src/domain/dto/flows';
import { Inventory, Investigation } from 'src/domain/entities/flows';
import { ProductItem } from 'src/domain/entities/items';
import {
  InventoryRepository,
  InvestigationRepository,
} from 'src/repositories/flows';
import { ProductItemRepository } from 'src/repositories/items';
import { GetInvestigationByIdInput } from './dto';

@Injectable()
export class GetInvestigationByIdService {
  constructor(
    @InjectRepository(Investigation)
    private readonly _investigationRepository: InvestigationRepository,
    @InjectRepository(Inventory)
    private readonly _inventoryRepository: InventoryRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
  ) {}

  async getInvestigationById(
    input: GetInvestigationByIdInput,
    user: UserCon,
  ): Promise<InvestigationItemOutput> {
    const result = await this._tryExecution(input, user);

    if (!result) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return result;
  }

  private async _tryExecution(
    input: GetInvestigationByIdInput,
    user: UserCon,
  ): Promise<InvestigationItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const investigation = await this._investigationRepository.findOne(
        input.investigationId,
        { relations: ['inventory', 'productItem'] },
      );

      // console.log(investigation.productItem);

      if (!investigation) {
        throw new NotFoundException(`Investigation not found`);
      }

      investigation.inventory = await this._inventoryRepository.findOne(
        investigation.inventoryId,
        { relations: ['location'] },
      );
      investigation.productItem = await this._productItemRepository.findOne(
        investigation.productItem.id,
        { relations: ['productVariant', 'location', 'supplier'] },
      );

      return new InvestigationItemOutput(investigation, lang);
    } catch (error) {
      throw new BadRequestException(
        `${GetInvestigationByIdService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
