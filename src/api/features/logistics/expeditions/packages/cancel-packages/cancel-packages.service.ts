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
import { AddDeliveryInput } from './dto';
import { PackagesRepository } from 'src/repositories/orders';
import { CancelPackagesInput } from './dto/cancel-input.dto';


type ValidationResult = {
  packages: CancelPackagesInput;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class CancelPackageService {

  constructor(
    @InjectRepository(Packages)
    private readonly _packagesRepository: Repository<PackagesRepository>,
  ) {}

  async cancelPackage(
    input: CancelPackagesInput,
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
  ): Promise<AddDeliveryInput> {


    try {
      // Delete package from DB
      return await this._packagesRepository.delete(result.packages.packageId);

    } catch (error) {
      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }

  private async _tryValidation(
    input: CancelPackagesInput,
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
      const packagesData = await this._packagesRepository.findOne(input.packageId);
      if (!packagesData) {
        throw new HttpException(`Package with id ${input.packageId} not found`, HttpStatus.NOT_FOUND);
      }

      return { packages: input, user, lang };
    } catch (error) {
      throw new BadRequestException("Validation failed");
    }

  }

}
