import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { PickingListItemOutput } from 'src/domain/dto/flows';
import { PickingList } from 'src/domain/entities/flows';
import { VariantToPickModel } from 'src/domain/interfaces/flows';
import { PickingListRepository } from 'src/repositories/flows';
import { GetPickingListByIdInput } from './dto';

@Injectable()
export class GetPickingListByIdService {
  constructor(
    @InjectRepository(PickingList)
    private readonly _pickingListRepository: PickingListRepository,
  ) {}

  async getPickingListById(
    input: GetPickingListByIdInput,
    user: UserCon,
  ): Promise<PickingListItemOutput> {
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
    input: GetPickingListByIdInput,
    user: UserCon,
  ): Promise<PickingListItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const picking = await this._pickingListRepository.findOne(
        input.pickingListId,
        {
          relations: [
            'variantNeededs',
            'articleOrdereds',
            'variantTransferts',
            'internalNeed',
            'order',
            'transfert',
          ],
        },
      );

      if (!picking) {
        throw new NotFoundException(
          `Picking list with id '${input.pickingListId}' not found`,
        );
      }

      // if (picking.transfert) {
      //   picking.transfert = await this._transfertRepository.findOne(
      //     picking.transfert.id,
      //     { relations: ['source', 'target', 'child'] },
      //   );
      // }

      const variantsToPick: VariantToPickModel[] = [];

      /**
       * Build output for variantNeededs
       */
      // if (picking.variantNeededs && picking.variantNeededs.length > 0) {
      //   variantsToPick = await this._sharedService.buildPickingListOutput(
      //     picking.variantNeededs,
      //   );
      // }

      /**
       * Build output for articleOrdereds
       */
      // if (picking.articleOrdereds && picking.articleOrdereds.length > 0) {
      //   variantsToPick = await this._sharedService.buildPickingListOutput(
      //     picking.articleOrdereds,
      //   );
      // }

      /**
       * Build output for variantTransferts
       */
      // if (picking.variantTransferts && picking.variantTransferts.length > 0) {
      //   variantsToPick = await this._sharedService.buildPickingListOutput(
      //     picking.variantTransferts,
      //   );
      // }

      return new PickingListItemOutput(picking, variantsToPick, lang);
    } catch (error) {
      throw new BadRequestException(
        `${GetPickingListByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
