import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { PickingListItemOutput } from 'src/domain/dto/flows';
import { PickingList } from 'src/domain/entities/flows';
import { OperationStatus } from 'src/domain/enums/flows';
import {
  PickingListsOutputModel,
  VariantToPickModel,
} from 'src/domain/interfaces/flows';
import { PickingListRepository } from 'src/repositories/flows';
import { ValidatePickingListInput, ValidatePickingListsOutput } from './dto';

@Injectable()
export class ValidatePickingListService {
  constructor(
    @InjectRepository(PickingList)
    private readonly _pickingListRepository: PickingListRepository,
  ) {}

  async validatePickingList(
    input: ValidatePickingListInput,
    user: UserCon,
  ): Promise<ValidatePickingListsOutput> {
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
    input: ValidatePickingListInput,
    user: UserCon,
  ): Promise<ValidatePickingListsOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const pickings = await this._pickingListRepository.findByIds(
        input.pickingListIds,
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

      if (!pickings || pickings.length !== input.pickingListIds.length) {
        throw new NotFoundException(`Some picking lists not found`);
      }

      const pickingListsToEdit: PickingList[] = [];

      pickings.map((picking) => {
        if (picking.status !== OperationStatus.PENDING) {
          throw new BadRequestException(
            `Cannot validate ${picking.status} picking list`,
          );
        }

        picking.status = OperationStatus.VALIDATED;

        pickingListsToEdit.push(picking);
      });

      await this._pickingListRepository.save(pickingListsToEdit);

      const outputs: PickingListsOutputModel[] = [];

      await Promise.all(
        pickingListsToEdit.map(async (picking) => {
          const variantsToPick: VariantToPickModel[] = [];

          // if (picking.transfert) {
          //   picking.transfert = await this._transfertRepository.findOne(
          //     picking.transfert.id,
          //     { relations: ['source', 'target', 'child'] },
          //   );
          // }

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
          // if (
          //   picking.variantTransferts &&
          //   picking.variantTransferts.length > 0
          // ) {
          //   variantsToPick = await this._sharedService.buildPickingListOutput(
          //     picking.variantTransferts,
          //   );
          // }

          outputs.push({ picking, variantsToPick });
        }),
      );

      return new ValidatePickingListsOutput(
        outputs.map(
          (output) =>
            new PickingListItemOutput(
              output.picking,
              output.variantsToPick,
              lang,
            ),
        ),
        outputs.length,
      );
    } catch (error) {
      throw new ConflictException(
        `${ValidatePickingListService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }
}
