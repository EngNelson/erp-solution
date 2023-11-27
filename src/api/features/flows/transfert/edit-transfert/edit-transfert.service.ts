import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Transfert } from 'src/domain/entities/flows';
import { TransfertRepository } from 'src/repositories/flows';
import { TransfertService } from 'src/services/references/flows';
import { EditTransfertInput } from './dto';
import { ISOLang, UserCon } from '@glosuite/shared';
import { TransfertItemDetailsOutput } from 'src/domain/dto/flows';

@Injectable()
export class EditTransfertService {
  constructor(
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    private readonly _transfertService: TransfertService,
  ) {}

  async editTransfert(
    input: EditTransfertInput,
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
    input: EditTransfertInput,
    user: UserCon,
  ): Promise<TransfertItemDetailsOutput> {
    try {
      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

      const { reference, comment } = input;

      const transfert = await this._transfertRepository.findOne({
        where: { reference },
        relations: [
          'source',
          'target',
          'parent',
          'child',
          'mobileUnits',
          'variantTransferts',
          'order',
        ],
      });

      if (!transfert) {
        throw new NotFoundException(
          `Transfert with reference '${reference}' not found`,
        );
      }

      transfert.comments = this._transfertService.buildOrderComments(
        transfert,
        comment,
        user,
      );

      await this._transfertRepository.save(transfert);

      const transfertModel = await this._transfertService.buildTransfertOutput(
        transfert,
      );

      return new TransfertItemDetailsOutput(transfertModel, lang);
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        `${EditTransfertService.name} - ${this._tryExecution.name} - ` +
          error.message,
      );
    }
  }
}
