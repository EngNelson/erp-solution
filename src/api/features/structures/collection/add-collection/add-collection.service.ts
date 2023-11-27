import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CollectionType,
  getLangOrFirstAvailableValue,
  isNullOrWhiteSpace,
  ISOLang,
  Status,
  UserCon,
} from '@glosuite/shared';
import { CollectionItemOutput } from 'src/domain/dto/structures';
import { Category, Collection } from 'src/domain/entities/structures';
import {
  CategoryRepository,
  CollectionRepository,
} from 'src/repositories/structures';
import { AddCollectionInput } from './dto';
import { CollectionModel } from 'src/domain/interfaces/structures';
import { SharedService } from 'src/services/utilities';
import { In } from 'typeorm';

type ValidationResult = {
  categories: Category[];
  parentCollection: Collection;
  subCollections: Collection[];
  isParentCollection: boolean;
  isSubCollections: boolean;
  isCategories: boolean;
  lang: ISOLang;
};

@Injectable()
export class AddCollectionService {
  constructor(
    @InjectRepository(Collection)
    private readonly _collectionRepository: CollectionRepository,
    @InjectRepository(Category)
    private readonly _categoryRepository: CategoryRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async addCollection(
    input: AddCollectionInput,
    user: UserCon,
  ): Promise<CollectionItemOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(
      input,
      validationResult,
      user,
    );

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: AddCollectionInput,
    validationResult: ValidationResult,
    user: UserCon,
  ): Promise<CollectionItemOutput> {
    const collection = new Collection();

    try {
      const {
        categories,
        parentCollection,
        subCollections,
        isParentCollection,
        isSubCollections,
        isCategories,
        lang,
      } = validationResult;

      collection.title = input.title;
      collection.description = input.description;
      collection.status = input.status ? input.status : Status.ENABLED;
      collection.collectionType = input.collectionType
        ? input.collectionType
        : CollectionType.DEFAULT;
      collection.startDate = input.startDate;
      collection.endDate = input.endDate;
      collection.createdBy = user;

      if (isCategories) {
        collection.categories = categories;
      }

      if (isParentCollection) {
        collection.parentCollection = parentCollection;
      }

      await this._collectionRepository.save(collection);

      if (isSubCollections) {
        const subCollectionsToUpdate: Collection[] = [];

        subCollections.forEach((subCol) => {
          subCol.parentCollection = collection;

          subCollectionsToUpdate.push(subCol);
        });

        await this._collectionRepository.save(subCollectionsToUpdate);
      }

      const output = await this._collectionRepository.findOne({
        where: { id: collection.id },
        relations: [
          'categories',
          'parentCollection',
          'subCollections',
          'productVariants',
        ],
      });

      const articles = await this._sharedService.buildCollectionArticlesOutput(
        output.productVariants,
      );

      const collectionModel: CollectionModel = { collection: output, articles };

      return new CollectionItemOutput(collectionModel, lang);
    } catch (error) {
      if (collection.id) {
        await this._collectionRepository.delete(collection.id);
      }
      throw new ConflictException(
        `${AddCollectionService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: AddCollectionInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

      let categories: Category[] = [];

      if (input.categoryIds && input.categoryIds.length > 0) {
        categories = await this._categoryRepository.findByIds(
          input.categoryIds,
        );
        if (!categories) {
          throw new NotFoundException(
            `Some categories among ids '${input.categoryIds}' are not found`,
          );
        }
      }

      let parentCollection: Collection = null;
      let subCollections: Collection[] = [];

      if (!isNullOrWhiteSpace(input.parentCollecctionId)) {
        parentCollection = await this._collectionRepository.findOne({
          where: { id: input.parentCollecctionId },
        });
        if (!parentCollection) {
          throw new NotFoundException(
            `Collection with id '${input.parentCollecctionId}' not found`,
          );
        }
      }

      if (input.subCollectionsIds && input.subCollectionsIds.length > 0) {
        subCollections = await this._collectionRepository.find({
          where: { id: In(input.subCollectionsIds) },
        });
        if (subCollections.length !== input.subCollectionsIds.length) {
          throw new NotFoundException(
            `Some subcollections among ids: '${input.subCollectionsIds}' are not found`,
          );
        }

        subCollections.forEach((subCol) => {
          if (subCol.parentCollection) {
            throw new HttpException(
              `The collection '${getLangOrFirstAvailableValue(
                subCol.title,
                lang,
              )}' already have a parent collection`,
              HttpStatus.CONFLICT,
            );
          }
        });
      }

      return {
        categories,
        parentCollection,
        subCollections,
        isParentCollection: !!parentCollection,
        isSubCollections: subCollections.length > 0,
        isCategories: categories.length > 0,
        lang,
      };
    } catch (error) {
      throw new BadRequestException(
        `${AddCollectionService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
