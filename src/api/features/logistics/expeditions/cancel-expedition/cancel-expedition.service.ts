import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  isNullOrWhiteSpace,
  ISOLang,
  UserCon,
} from '@glosuite/shared';

import { CancelExpeditionInput } from './dto/cancel-input.dto';
import { Expedition} from 'src/domain/entities/logistics';
import { Repository } from 'typeorm';


type ValidationResult = {
  packages: CancelExpeditionInput;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class CancelExpeditionService {

  constructor(
    @InjectRepository(Expedition)
    private readonly _expeditionRepository: Repository<ExpeditionRepository>,
  ) {}

  async cancelExpedition(
    input: CancelExpeditionInput,
    user: UserCon,
    accessToken: string,
  ): Promise<any> {

    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(
      accessToken,
      validationResult,
    );
    if (!executionResult) {
      throw new HttpException(
        'Error Ocured During Execution',
        HttpStatus.CREATED,
      );
    }
    return executionResult;
  }

  private async _tryExecution(
    accessToken: string,
    result: ValidationResult,
  ): Promise<AddExpeditionInput> {


    try {
      // Delete package from DB
      return await this._expeditionRepository.delete(result.packages.packageId);

    } catch (error) {
      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }

  private async _tryValidation(
    input: CancelExpeditionInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
          ? user.preferedLang
          : ISOLang.FR;

      // Check For Null or White Space Values
      if (
        isNullOrWhiteSpace(input.packageId)
      ) {
        throw new BadRequestException(
          `PackageId is required`,
        );
      }

      // Check If PackageId Exists
      const expeditionData = await this._expeditionRepository.findOne(input.packageId);
      if (!expeditionData) {
        throw new HttpException(`Package with id ${input.packageId} not found`, HttpStatus.NOT_FOUND);
      }

      return { expedition: input, user, lang };
    } catch (error) {
      throw new BadRequestException("Validation failed");
    }

  }

}
