import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CollectionType, ISOLang, Status, UserCon } from '@glosuite/shared';
import { CollectionItemOutput } from 'src/domain/dto/structures';
import { Category, Collection } from 'src/domain/entities/structures';
import { CollectionModel } from 'src/domain/interfaces/structures';
import {
  CategoryRepository,
  CollectionRepository,
} from 'src/repositories/structures';
import { SharedService } from 'src/services/utilities';
import {
  GetCategoryCollectionsInput,
  GetCategoryCollectionsOutput,
} from './dto';

type ValidationResult = {
  category: Category;
  lang?: ISOLang;
  status: Status;
  type: CollectionType;
  isType: boolean;
};

type WhereClause = {
  status: Status;
  collectionType?: CollectionType;
};

@Injectable()
export class GetCategoryCollectionsService {
  constructor(
    @InjectRepository(Collection)
    private readonly _collectionRepository: CollectionRepository,
    @InjectRepository(Category)
    private readonly _categoryRepository: CategoryRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async getCollectionsByCategory(
    input: GetCategoryCollectionsInput,
    user: UserCon,
  ): Promise<GetCategoryCollectionsOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException(
        'inputs validation error',
        HttpStatus.BAD_REQUEST,
      );
    }

    const executionResult: GetCategoryCollectionsOutput =
      await this._tryExecution(validationResult);

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
  ): Promise<GetCategoryCollectionsOutput> {
    try {
      const { category, lang, status, type, isType } = result;

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
        order: { createdAt: 'DESC' },
      });

      const outputs = collections.filter((collection) =>
        collection.categories.some((cat) => cat.id === category.id),
      );

      const collectionsOutput: CollectionModel[] = [];

      await Promise.all(
        outputs.map(async (collection) => {
          const articles =
            await this._sharedService.buildCollectionArticlesOutput(
              collection.productVariants,
            );

          const collectionModel: CollectionModel = { collection, articles };
          collectionsOutput.push(collectionModel);
        }),
      );

      return new GetCategoryCollectionsOutput(
        collectionsOutput.map(
          (collection) => new CollectionItemOutput(collection, lang),
        ),
        outputs.length,
      );
    } catch (error) {
      throw new BadRequestException(
        `${GetCategoryCollectionsService.name} - ${this._tryExecution.name}`,
        error,
      );
    }
  }

  private async _tryValidation(
    input: GetCategoryCollectionsInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const status = input.options.status
        ? input.options.status
        : Status.ENABLED;
      const type = input.options.type ? input.options.type : null;

      const category = await this._categoryRepository.findOne({
        where: { id: input.categoryId },
      });
      if (!category) {
        throw new NotFoundException(
          `Category with id '${input.categoryId}' not found`,
        );
      }

      return { category, lang, status, type, isType: !!type };
    } catch (error) {
      throw new BadRequestException(
        `${GetCategoryCollectionsService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
