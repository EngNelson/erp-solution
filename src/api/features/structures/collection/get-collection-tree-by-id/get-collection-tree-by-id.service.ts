import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, Status, UserCon } from '@glosuite/shared';
import { CollectionItemOutput } from 'src/domain/dto/structures';
import { Collection } from 'src/domain/entities/structures';
import { CollectionType } from 'src/domain/enums/structures';
import { CollectionModel } from 'src/domain/interfaces/structures';
import {
  CollectionRepository,
  CollectionTreeRepository,
} from 'src/repositories/structures';
import { SharedService } from 'src/services/utilities';
import { GetCollectionTreeByIdInput } from './dto';

type ValidationResult = {
  collection: Collection;
  lang: ISOLang;
  status: Status;
  type: CollectionType;
  isStatus: boolean;
  isTypeOption: boolean;
};

type WhereClause = {
  parentCollectionId?: string;
  status?: Status;
  collectionType?: CollectionType;
};

@Injectable()
export class GetCollectionTreeByIdService {
  constructor(
    @InjectRepository(Collection)
    private readonly _collectionRepository: CollectionRepository,
    @InjectRepository(Collection)
    private readonly _collectionTreeRepository: CollectionTreeRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async getCollectionTreeById(
    input: GetCollectionTreeByIdInput,
    user: UserCon,
  ): Promise<CollectionItemOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException(
        'inputs validation error',
        HttpStatus.BAD_REQUEST,
      );
    }

    const executionResult = await this._tryExecution(validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    validationResult: ValidationResult,
  ): Promise<CollectionItemOutput> {
    try {
      const { collection, lang, status, type, isStatus, isTypeOption } =
        validationResult;

      const whereClause: WhereClause = {};
      if (isStatus) {
        whereClause.status = status;
      }

      if (isTypeOption) {
        whereClause.collectionType = type;
      }

      const collectionTree =
        await this._collectionTreeRepository.findDescendantsTree(collection, {
          relations: ['productVariants'],
        });

      const articles = await this._sharedService.buildCollectionArticlesOutput(
        collectionTree.productVariants,
      );

      const collectionOutput: CollectionModel = {
        collection: collectionTree,
        articles,
      };

      return new CollectionItemOutput(collectionOutput, lang);
    } catch (error) {
      throw new BadRequestException(
        `${GetCollectionTreeByIdService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: GetCollectionTreeByIdInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const { id, lang, options } = input;
      const getLang = lang
        ? lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;
      const { status, type } = options;

      const collection = await this._collectionRepository.findOne({
        where: { id },
        relations: ['categories', 'parentCollection'],
      });

      if (!collection) {
        throw new NotFoundException(`Collection with id '${id}' not found`);
      }

      return {
        collection,
        lang: getLang,
        status,
        type,
        isStatus: !!status,
        isTypeOption: !!type,
      };
    } catch (error) {
      throw new BadRequestException(
        `${GetCollectionTreeByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
