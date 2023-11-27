import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { MiniTransfertOutput } from 'src/domain/dto/flows';
import { Transfert } from 'src/domain/entities/flows';
import { TransfertRepository } from 'src/repositories/flows';
import { Like } from 'typeorm';
import {
  SearchTransfertsByReferenceInput,
  SearchTransfertsByReferenceOutput,
} from './dto';

@Injectable()
export class SearchTransfertsByReferenceService {
  constructor(
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
  ) {}

  async searchTransfertsByReference(
    input: SearchTransfertsByReferenceInput,
    user: UserCon,
  ): Promise<SearchTransfertsByReferenceOutput> {
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
    input: SearchTransfertsByReferenceInput,
    user: UserCon,
  ): Promise<SearchTransfertsByReferenceOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const transferts = await this._transfertRepository.find({
        where: { reference: Like(`%${input.motcle}%`) },
        relations: ['source', 'target', 'order'],
        order: { createdAt: 'DESC' },
      });

      return new SearchTransfertsByReferenceOutput(
        transferts.map((transfert) => new MiniTransfertOutput(transfert, lang)),
        transferts.length,
      );
    } catch (error) {
      throw new BadRequestException(
        `${SearchTransfertsByReferenceService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
