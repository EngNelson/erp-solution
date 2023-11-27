import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { TransfertItemDetailsOutput } from 'src/domain/dto/flows';
import { Transfert } from 'src/domain/entities/flows';
import { TransfertRepository } from 'src/repositories/flows';
import { GetTransfertByIdInput } from './dto';
import { TransfertService } from 'src/services/references/flows';

@Injectable()
export class GetTransfertByIdService {
  constructor(
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    private readonly _transfertService: TransfertService,
  ) {}

  async getTransfertById(
    input: GetTransfertByIdInput,
    user: UserCon,
  ): Promise<TransfertItemDetailsOutput> {
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
    input: GetTransfertByIdInput,
    user: UserCon,
  ): Promise<TransfertItemDetailsOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const transfert = await this._transfertRepository.findOne(
        input.transfertId,
        {
          relations: [
            'source',
            'target',
            'parent',
            'child',
            'mobileUnits',
            'variantTransferts',
            'order',
            'purchaseOrder',
          ],
        },
      );

      if (!transfert) {
        throw new NotFoundException(
          `Transfert with id '${input.transfertId}' not found`,
        );
      }

      const transfertModel = await this._transfertService.buildTransfertOutput(
        transfert,
      );

      return new TransfertItemDetailsOutput(transfertModel, lang);
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetTransfertByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
