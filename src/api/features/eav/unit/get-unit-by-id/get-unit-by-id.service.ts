import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { UnitItemOutput } from 'src/domain/dto/items/eav';
import { Unit } from 'src/domain/entities/items/eav';
import { UnitRepository } from 'src/repositories/items';
import { GetUnitByIdInput } from './dto';

@Injectable()
export class GetUnitByIdService {
  constructor(
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
  ) {}

  async getUnitById(
    input: GetUnitByIdInput,
    user: UserCon,
  ): Promise<UnitItemOutput> {
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
    input: GetUnitByIdInput,
    user: UserCon,
  ): Promise<UnitItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const unit = await this._unitRepository.findOne(input.unitId, {
        relations: ['primary', 'auxiliaries'],
      });

      if (!unit) {
        throw new NotFoundException(`Unit with id '${input.unitId}' not found`);
      }

      return new UnitItemOutput(unit, lang);
    } catch (error) {
      throw new BadRequestException(
        `${GetUnitByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
