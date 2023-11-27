import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AgentRoles, UserCon } from '@glosuite/shared';
import { Unit } from 'src/domain/entities/items/eav';
import { UnitRepository } from 'src/repositories/items';
import { DeleteUnitsInput, DeleteUnitsOutput } from './dto';

type ValidationResult = {
  units: Unit[];
  user: UserCon;
};

@Injectable()
export class DeleteUnitsService {
  constructor(
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
  ) {}

  async deleteUnits(
    input: DeleteUnitsInput,
    user: UserCon,
  ): Promise<DeleteUnitsOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CONFLICT,
      );
    }

    return new DeleteUnitsOutput(executionResult.length, true);
  }

  private async _tryExecution(result: ValidationResult): Promise<Unit[]> {
    try {
      const { units, user } = result;

      const unitsToDelete: Unit[] = [];

      units.forEach((unit) => {
        unit.deletedBy = user;

        unitsToDelete.push(unit);
        this._unitRepository.softDelete(unit.id);
      });

      await this._unitRepository.save(unitsToDelete);

      return unitsToDelete;
    } catch (error) {
      throw new ConflictException(
        `${DeleteUnitsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: DeleteUnitsInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const { unitIds } = input;

      const units = await this._unitRepository.findByIds(unitIds, {
        relations: ['attributes'],
      });

      if (units.length < unitIds.length) {
        throw new NotFoundException(`Some units to delete are not found`);
      }

      units.forEach((unit) => console.log(unit.attributes));

      /**
       * On verifi si au moins un unit est deja associe a un
       * ou plusieurs attributs
       */
      const isSomeAreAssociatedToAttribute = units.some(
        (unit) => unit.attributes.length > 0,
      );

      if (isSomeAreAssociatedToAttribute) {
        throw new BadRequestException(
          `Cannot delete units already associated with one or more attributes`,
        );
      }

      const isUserNotHavePrivileges = units.some(
        (unit) =>
          unit.createdBy.email !== user.email &&
          user.roles.some(
            (role) =>
              role !== AgentRoles.SUPER_ADMIN && role !== AgentRoles.ADMIN,
          ),
      );
      if (isUserNotHavePrivileges) {
        throw new UnauthorizedException(
          `You can only delete units that you have created before`,
        );
      }

      return { units, user };
    } catch (error) {
      throw new BadRequestException(
        `${DeleteUnitsService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
