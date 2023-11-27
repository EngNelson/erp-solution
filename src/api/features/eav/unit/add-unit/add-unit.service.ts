import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { UnitItemOutput } from 'src/domain/dto/items/eav';
import { Unit } from 'src/domain/entities/items/eav';
import { UnitRepository } from 'src/repositories/items';
import { AddUnitInput } from './dto';

@Injectable()
export class AddUnitService {
  constructor(
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
  ) {}

  async addUnit(input: AddUnitInput, user: UserCon): Promise<UnitItemOutput> {
    const executionResult = await this._tryExecution(input, user);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: AddUnitInput,
    user: UserCon,
  ): Promise<UnitItemOutput> {
    const unit = new Unit();

    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      unit.title = input.title;
      unit.symbol = input.symbol;
      unit.createdBy = user;

      await this._unitRepository.save(unit);

      return new UnitItemOutput(unit, lang);
    } catch (error) {
      if (unit.id) {
        await this._unitRepository.delete(unit.id);
      }

      throw new ConflictException(
        `${AddUnitService.name} - ${this._tryExecution.name}` + error.message,
      );
    }
  }
}
