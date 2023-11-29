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
import { Expedition } from 'src/domain/entities/logistics';
import { EditExpeditionInput } from './dto/edit-input.dto';



type ValidationResult = {
  package: EditExpeditionInput;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class EditExpeditionService {
  constructor(
    @InjectRepository()
    private readonly _expeditionRepository: Repository<ExpeditionRepository>,
  ) {}

  async editExpedition(
    input: EditExpeditionInput,
    user: UserCon,
    accessToken: string,
  ): Promise<EditExpeditionInput> {

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
      // Update Package Data in DB And Send Response To Frontend
      return await this._expeditionRepository.update([result.expedition.expeditionId],result.expedition);

    } catch (error) {
      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }

  private async _tryValidation(
    input: EditExpeditionInput,
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
        isNullOrWhiteSpace(input.expeditionId)
      ) {
        throw new BadRequestException(
          `PackageId is required`,
        );
      }

      // Check If OrderId Exists
      const packageData = await this._expeditionRepository.findOne(input.expeditionId);
      if (!packageData) {
        throw new HttpException(`Order with id ${input.packageId} not found`, HttpStatus.NOT_FOUND);
      }

      return { package: input, user, lang };
    } catch (error) {
      throw new BadRequestException("Validation failed");
    }

  }

}
