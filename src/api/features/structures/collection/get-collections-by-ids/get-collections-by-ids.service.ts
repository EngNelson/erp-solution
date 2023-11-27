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
  UserCon,
} from '@glosuite/shared';
import { CollectionItemOutput } from 'src/domain/dto/structures';
import { Collection } from 'src/domain/entities/structures';
import { CollectionModel } from 'src/domain/interfaces/structures';
import { CollectionRepository } from 'src/repositories/structures';
import { SharedService } from 'src/services/utilities';
import { GetCollectionsByIdsInput, GetCollectionsByIdsOutput } from './dto';
import { In } from 'typeorm';

type ValidationResult = {
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
};

@Injectable()
export class GetCollectionsByIdsService {
  constructor(
    @InjectRepository(Collection)
    private readonly _collectionRepository: CollectionRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async getCollectionsByIds(
    input: GetCollectionsByIdsInput,
    user: UserCon,
  ): Promise<GetCollectionsByIdsOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException(
        'inputs validation error',
        HttpStatus.BAD_REQUEST,
      );
    }

    const executionResult: GetCollectionsByIdsOutput = await this._tryExecution(
      validationResult,
      input.ids,
    );

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    result: ValidationResult,
    ids: string[],
  ): Promise<GetCollectionsByIdsOutput> {
    try {
      const { pageIndex, pageSize, lang } = result;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const collections = await this._collectionRepository.find({
        where: { id: In(ids) },
        relations: [
          'productVariants',
          'parentCollection',
          'subCollections',
          'categories',
        ],
        order: { createdAt: 'DESC' },
        skip,
        take,
      });

      const allCollections = await this._collectionRepository.find({
        where: { id: In(ids) },
      });

      /**
       * Build the output
       */
      const collectionsOutput: CollectionModel[] = [];

      await Promise.all(
        collections.map(async (collection) => {
          const articles =
            await this._sharedService.buildCollectionArticlesOutput(
              collection.productVariants,
            );

          const collectionModel: CollectionModel = { collection, articles };
          collectionsOutput.push(collectionModel);
        }),
      );

      return new GetCollectionsByIdsOutput(
        collectionsOutput.map(
          (collection) => new CollectionItemOutput(collection, lang),
        ),
        allCollections.length,
        pageIndex,
        pageSize,
      );
    } catch (error) {
      throw new BadRequestException(
        `${GetCollectionsByIdsInput.name} - ${this._tryExecution.name}`,
        error,
      );
    }
  }

  private async _tryValidation(
    input: GetCollectionsByIdsInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const { ids, pagination } = input;

      pagination.pageIndex = pagination.pageIndex
        ? parseInt(pagination.pageIndex.toString())
        : 1;
      pagination.pageSize = pagination.pageSize
        ? parseInt(pagination.pageSize.toString())
        : 25;

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

      return { ...pagination };
    } catch (error) {
      throw new BadRequestException(
        `${GetCollectionsByIdsInput.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
