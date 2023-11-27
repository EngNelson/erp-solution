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
import { EditUnitInput } from './dto';

type ValidationResult = {
  unit: Unit;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class EditUnitService {
  constructor(
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
  ) {}

  async editUnit(input: EditUnitInput, user: UserCon): Promise<UnitItemOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(input, validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: EditUnitInput,
    result: ValidationResult,
  ): Promise<UnitItemOutput> {
    try {
      const { unit, lang, user } = result;

      if (input.title) {
        const inputLangs = Object.keys(input.title);
        inputLangs.forEach((l) => (unit.title[l] = input.title[l]));
      }

      if (input.symbol) {
        unit.symbol = input.symbol;
      }

      unit.updatedBy = user;

      await this._unitRepository.save(unit);

      return new UnitItemOutput(unit, lang);
    } catch (error) {
      throw new BadRequestException(
        `${EditUnitService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private async _tryValidation(
    input: EditUnitInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

      const unit = await this._unitRepository.findOne(input.unitId);
      if (!unit) {
        throw new NotFoundException(`Unit to edit not found`);
      }

      return { unit, lang, user };
    } catch (error) {
      throw new BadRequestException(
        `${EditUnitService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }
}
