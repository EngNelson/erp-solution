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
import { Packages } from 'src/domain/entities/logistics';
import { EditPackagesInput } from './dto/edit-input.dto';
import { AddPackagesInput } from '../add-packages/dto';
import { GetPackageByIdInput } from './dto/get-package-by-id-input.dto';


type ValidationResult = {
  package: GetPackageByIdInput;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class GetPackageByIdService {
  constructor(
    @InjectRepository(Packages)
    private readonly _packagesRepository: Repository<PackagesRepository>,
  ) {}

  async getPackageById(
    input: GetPackageByIdInput,
    user: UserCon,
    accessToken: string,
  ): Promise<GetPackageByIdInput> {

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
  ): Promise<AddPackagesInput> {


    try {
      
      return await this._packagesRepository.findOne(result.package.packageId);

    } catch (error) {
      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }

  private async _tryValidation(
    input: GetPackageByIdInput,
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

      // Check If Package Exists
      const packageData = await this._packagesRepository.findOne(input.packageId);
      if (!packageData) {
        throw new HttpException(`Package with id ${input.packageId} not found`, HttpStatus.NOT_FOUND);
      }

      return { package: input, user, lang };
    } catch (error) {
      throw new BadRequestException("Validation failed");
    }

  }

}
