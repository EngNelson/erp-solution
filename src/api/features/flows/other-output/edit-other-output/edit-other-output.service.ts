import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OtherOutput } from 'src/domain/entities/flows';
import { OtherOutputRepository } from 'src/repositories/flows';
import { EditOtherOutputInput } from './dto';
import { ISOLang, UserCon } from '@glosuite/shared';
import { OtherOutputItemOutput } from 'src/domain/dto/flows';
import { OtherOutputService } from 'src/services/generals';

@Injectable()
export class EditOtherOutputService {
  constructor(
    @InjectRepository(OtherOutput)
    private readonly _otherOutputRepository: OtherOutputRepository,
    private readonly _otherOutputService: OtherOutputService,
  ) {}

  async editOtherOutput(
    input: EditOtherOutputInput,
    user: UserCon,
  ): Promise<OtherOutputItemOutput> {
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
    input: EditOtherOutputInput,
    user: UserCon,
  ): Promise<OtherOutputItemOutput> {
    try {
      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

      const { reference, comment } = input;

      const otherOutput = await this._otherOutputRepository.findOne({
        where: { reference },
        relations: [
          'storagePoint',
          'variantsToOutput',
          'productItems',
          'stockMovements',
          'child',
          'parent',
        ],
      });

      if (!otherOutput) {
        throw new NotFoundException(
          `Other output you are trying to edit is not found`,
        );
      }

      otherOutput.comments = this._otherOutputService.buildOrderComments(
        otherOutput,
        comment,
        user,
      );

      await this._otherOutputRepository.save(otherOutput);

      const otherOutputModel =
        await this._otherOutputService.buildOtherOutputOutput(otherOutput);

      return new OtherOutputItemOutput(otherOutputModel, lang);
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        `${EditOtherOutputService.name} - ${this._tryExecution.name} - ` +
          error.message,
      );
    }
  }
}
