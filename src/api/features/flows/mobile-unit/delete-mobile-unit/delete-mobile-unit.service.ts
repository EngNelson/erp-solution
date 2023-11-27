import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserCon } from '@glosuite/shared';
import { MobileUnit } from 'src/domain/entities/flows';
import { MobileUnitRepository } from 'src/repositories/flows';
import { DeleteMobileUnitInput } from './dto';

@Injectable()
export class DeleteMobileUnitService {
  constructor(
    @InjectRepository(MobileUnit)
    private readonly _mobileUnitRepository: MobileUnitRepository,
  ) {}

  async deleteMobileUnit(
    input: DeleteMobileUnitInput,
    user: UserCon,
  ): Promise<boolean> {
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
    input: DeleteMobileUnitInput,
    user: UserCon,
  ): Promise<boolean> {
    try {
      const mobileUnit = await this._mobileUnitRepository.findOne(
        input.mobileUnitId,
        { relations: ['productItems'] },
      );

      if (!mobileUnit) {
        throw new NotFoundException(
          `Mobile Unit you want to delete is not found`,
        );
      }

      if (mobileUnit.productItems && mobileUnit.productItems.length > 0) {
        throw new BadRequestException(
          `Cannot delete mobile unit ${mobileUnit.name}. Containing ${mobileUnit.productItems.length} products`,
        );
      }

      this._mobileUnitRepository.delete(mobileUnit.id);

      this._mobileUnitRepository.save(mobileUnit);

      return true;
    } catch (error) {
      throw new ConflictException(
        `${DeleteMobileUnitService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
