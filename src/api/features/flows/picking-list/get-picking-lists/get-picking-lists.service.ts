import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DEFAULT_PAGE_INDEX,
  DEFAULT_PAGE_SIZE,
  ISOLang,
  PaginationInput,
  UserCon,
} from '@glosuite/shared';
import {
  GetPickingListsOptionsDto,
  PickingListItemOutput,
} from 'src/domain/dto/flows';
import { PickingList } from 'src/domain/entities/flows';
import { OperationStatus } from 'src/domain/enums/flows';
import {
  PickingListsOutputModel,
  VariantToPickModel,
} from 'src/domain/interfaces/flows';
import { PickingListRepository } from 'src/repositories/flows';
import { GetPickingListsInput, GetPickingListsOutput } from './dto';

type ValidationResult = {
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
  status?: OperationStatus.PENDING | OperationStatus.VALIDATED;
};

type WhereClause = {
  status?: OperationStatus.PENDING | OperationStatus.VALIDATED;
};

@Injectable()
export class GetPickingListsService {
  constructor(
    @InjectRepository(PickingList)
    private readonly _pickingListRepository: PickingListRepository,
  ) {}

  async getPickingLists(
    input: GetPickingListsInput,
    user: UserCon,
  ): Promise<GetPickingListsOutput> {
    const { pagination, options } = input;
    const validationResult = await this._tryValidation(
      pagination,
      user,
      options,
    );

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    result: ValidationResult,
  ): Promise<GetPickingListsOutput> {
    try {
      const { pageIndex, pageSize, lang, status } = result;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const whereClause: WhereClause = {};
      if (status) whereClause.status = status;

      const pickings = await this._pickingListRepository.find({
        where: whereClause,
        relations: [
          'variantNeededs',
          'articleOrdereds',
          'variantTransferts',
          'internalNeed',
          'order',
          'transfert',
        ],
        skip,
        take,
      });

      const allPickings = await this._pickingListRepository.findAndCount({
        where: whereClause,
      });

      const outputs: PickingListsOutputModel[] = [];

      await Promise.all(
        pickings.map(async (picking) => {
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

      return new GetPickingListsOutput(
        outputs.map(
          (output) =>
            new PickingListItemOutput(
              output.picking,
              output.variantsToPick,
              lang,
            ),
        ),
        allPickings[1],
        pageIndex,
        pageSize,
      );
    } catch (error) {
      throw new BadRequestException(
        `${GetPickingListsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    pagination: PaginationInput,
    user: UserCon,
    options?: GetPickingListsOptionsDto,
  ): Promise<ValidationResult> {
    try {
      pagination.pageIndex = pagination.pageIndex
        ? parseInt(pagination.pageIndex.toString())
        : DEFAULT_PAGE_INDEX;
      pagination.pageSize = pagination.pageSize
        ? parseInt(pagination.pageSize.toString())
        : DEFAULT_PAGE_SIZE;

      pagination.lang = pagination.lang
        ? pagination.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      if (Number.isNaN(pagination.pageIndex) || pagination.pageIndex <= 0) {
        throw new HttpException(
          `Invalid fields: pageIndex ${pagination.pageIndex}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (Number.isNaN(pagination.pageSize) || pagination?.pageSize < 0) {
        throw new HttpException(
          `Invalid fields: pageSize ${pagination.pageSize}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!ISOLang[pagination.lang.toUpperCase()]) {
        throw new HttpException(
          `Invalid language input: ${pagination.lang} is not supported`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return { ...pagination, ...options };
    } catch (error) {}
  }
}
