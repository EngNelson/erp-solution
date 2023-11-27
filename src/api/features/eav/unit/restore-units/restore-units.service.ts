import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AgentRoles, ISOLang, UserCon } from '@glosuite/shared';
import { Unit } from 'src/domain/entities/items/eav';
import { UnitRepository } from 'src/repositories/items';
import {
  RestoreUnitsInput,
  RestoreUnitsOutput,
  RestoreUnitsOutputItems,
} from './dto';

@Injectable()
export class RestoreUnitsService {
  constructor(
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
  ) {}

  async restoreUnits(
    input: RestoreUnitsInput,
    user: UserCon,
  ): Promise<RestoreUnitsOutput> {
    const executionResult = await this._tryExecution(input, user);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CONFLICT,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: RestoreUnitsInput,
    user: UserCon,
  ): Promise<RestoreUnitsOutput> {
    try {
      const { unitIds } = input;
      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

      const units = await this._unitRepository.findByIds(unitIds, {
        withDeleted: true,
      });
      if (units.length < unitIds.length) {
        throw new NotFoundException(
          `Some units you are trying to restore are not found`,
        );
      }

      const unitsToRestore: Unit[] = [];

      units.forEach(async (unit) => {
        this._unitRepository.restore(unit.id);
        unit.deletedBy = null;
        unitsToRestore.push(unit);
      });

      await this._unitRepository.save(unitsToRestore);

      return new RestoreUnitsOutput(
        unitsToRestore.map((unit) => new RestoreUnitsOutputItems(unit, lang)),
        unitsToRestore.length,
      );
    } catch (error) {
      throw new BadRequestException(
        `${RestoreUnitsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error.message,
      );
    }
  }
}
