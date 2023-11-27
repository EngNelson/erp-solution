import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { ReceptionItemOutput } from 'src/domain/dto/flows';
import { Reception } from 'src/domain/entities/flows';
import { ReceptionRepository } from 'src/repositories/flows';
import { GetReceptionByIdInput } from './dto';
import { ReceptionService } from 'src/services/references/flows';

@Injectable()
export class GetReceptionByIdService {
  constructor(
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    private readonly _receptionService: ReceptionService,
  ) {}

  async getReceptionById(
    input: GetReceptionByIdInput,
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
    input: GetReceptionByIdInput,
    user: UserCon,
  ): Promise<ReceptionItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const reception = await this._receptionRepository.findOne(
        input.receptionId,
        {
          relations: [
            'storagePoint',
            'purchaseOrder',
            'parent',
            'child',
            'mobileUnits',
            'variantReceptions',
            'productItems',
            'order',
          ],
        },
      );

      if (!reception) {
        throw new NotFoundException(
          `Reception with id '${input.receptionId}' not found`,
        );
      }

      const receptionModel = await this._receptionService.buildReceptionOutput(
        reception,
      );

      return new ReceptionItemOutput(receptionModel, lang);
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetReceptionByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
