import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Reception } from 'src/domain/entities/flows';
import { ReceptionRepository } from 'src/repositories/flows';
import { ReceptionService } from 'src/services/references/flows';
import { EditReceptionInput } from './dto';
import { ISOLang, UserCon } from '@glosuite/shared';
import { ReceptionItemOutput } from 'src/domain/dto/flows';

@Injectable()
export class EditReceptionService {
  constructor(
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    private readonly _receptionService: ReceptionService,
  ) {}

  async editReception(
    input: EditReceptionInput,
    user: UserCon,
  ): Promise<ReceptionItemOutput> {
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
    input: EditReceptionInput,
    user: UserCon,
  ): Promise<ReceptionItemOutput> {
    try {
      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

      const { reference, comment } = input;

      const reception = await this._receptionRepository.findOne({
        where: { reference },
        relations: [
          'storagePoint',
          'purchaseOrder',
          'parent',
          'child',
          'mobileUnits',
          'variantReceptions',
          'productItems',
        ],
      });

      if (!reception) {
        throw new NotFoundException(
          `Reception with reference '${reference}' not found`,
        );
      }

      reception.comments = this._receptionService.buildOrderComments(
        reception,
        comment,
        user,
      );

      await this._receptionRepository.save(reception);

      const receptionModel = await this._receptionService.buildReceptionOutput(
        reception,
      );

      return new ReceptionItemOutput(receptionModel, lang);
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        `${EditReceptionService.name} - ${this._tryExecution.name} - ` +
          error.message,
      );
    }
  }
}
