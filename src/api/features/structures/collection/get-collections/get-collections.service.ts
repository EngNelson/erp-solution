import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CollectionType,
  ISOLang,
  PaginationInput,
  Status,
  UserCon,
} from '@glosuite/shared';
import {
  CollectionItemOutput,
  GetCollectionsOptionsDto,
} from 'src/domain/dto/structures';
import { Collection } from 'src/domain/entities/structures';
import { CollectionModel } from 'src/domain/interfaces/structures';
import { CollectionRepository } from 'src/repositories/structures';
import { SharedService } from 'src/services/utilities';
import { GetCollectionsInput, GetCollectionsOutput } from './dto';

type ValidationResult = {
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
  status?: Status;
  type?: CollectionType;
  isType?: boolean;
};

type WhereClause = {
  status?: Status;
  collectionType?: CollectionType;
};

@Injectable()
export class GetCollectionsService {
  constructor(
    @InjectRepository(Collection)
    private readonly _collectionRepository: CollectionRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async getCollections(
    input: GetCollectionsInput,
    user: UserCon,
  ): Promise<GetCollectionsOutput> {
    const validationResult = await this._tryValidation(
      {
        pageIndex: input.pagination.pageIndex,
        pageSize: input.pagination.pageSize,
        lang: input.pagination.lang,
      },
      input.options,
    );

    if (!validationResult) {
      throw new HttpException(
        'inputs validation error',
        HttpStatus.BAD_REQUEST,
      );
    }

    const executionResult: GetCollectionsOutput = await this._tryExecution(
      validationResult,
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
  ): Promise<GetCollectionsOutput> {
    try {
      const { pageIndex, pageSize, lang, status, type, isType } = result;

      const skip = pageSize * ((pageIndex || 1) - 1);
      const take = pageSize || 25;

      const whereClause: WhereClause = { status };

      if (isType) {
        whereClause.collectionType = type;
      }

      const collections = await this._collectionRepository.find({
        relations: [
          'categories',
          'parentCollection',
          'subCollections',
          'productVariants',
        ],
        where: whereClause,
        order: {
          createdAt: 'DESC',
        },
        skip,
        take,
      });

      const [allCollections, count] =
        await this._collectionRepository.findAndCount({
          where: whereClause,
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

      return new GetCollectionsOutput(
        collectionsOutput.map(
          (collection) => new CollectionItemOutput(collection, lang),
        ),
        count,
        pageIndex,
        pageSize,
      );
    } catch (error) {
      throw new BadRequestException(
        `${GetCollectionsService.name} - ${this._tryExecution.name}`,
        error,
      );
    }
  }

  private async _tryValidation(
    pagination: PaginationInput,
    options: GetCollectionsOptionsDto,
  ): Promise<ValidationResult> {
    try {
      pagination.pageIndex = pagination.pageIndex
        ? parseInt(pagination.pageIndex.toString())
        : 1;
      pagination.pageSize = pagination.pageSize
        ? parseInt(pagination.pageSize.toString())
        : 25;

      pagination.lang = pagination.lang ? pagination.lang : ISOLang.FR;

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

      const status = options.status ? options.status : Status.ENABLED;
      const type = options.type ? options.type : null;

      return {
        ...pagination,
        status,
        type,
        isType: !!type,
      };
    } catch (error) {
      throw new BadRequestException(
        `${GetCollectionsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
