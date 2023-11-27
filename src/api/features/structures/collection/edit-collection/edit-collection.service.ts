import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isNullOrWhiteSpace, ISOLang, UserCon } from '@glosuite/shared';
import { CollectionItemOutput } from 'src/domain/dto/structures';
import { ProductVariant } from 'src/domain/entities/items';
import { Category, Collection } from 'src/domain/entities/structures';
import { CollectionModel } from 'src/domain/interfaces/structures';
import { ProductVariantRepository } from 'src/repositories/items';
import {
  CategoryRepository,
  CollectionRepository,
} from 'src/repositories/structures';
import { SharedService } from 'src/services/utilities';
import { EditCollectionInput } from './dto';
import { In } from 'typeorm';

type ValidationResult = {
  collection: Collection;
  variants: ProductVariant[];
  categories: Category[];
  parentCollection: Collection;
  subCollections: Collection[];
  isVariants: boolean;
  isCategories: boolean;
  isParentCollection: boolean;
  isSubCollections: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class EditCollectionService {
  constructor(
    @InjectRepository(Collection)
    private readonly _collectionRepository: CollectionRepository,
    @InjectRepository(Category)
    private readonly _categoryRepository: CategoryRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async editCollection(
    input: EditCollectionInput,
    user: UserCon,
  ): Promise<CollectionItemOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(input, validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: EditCollectionInput,
    result: ValidationResult,
  ): Promise<CollectionItemOutput> {
    try {
      const {
        collection,
        variants,
        categories,
        parentCollection,
        subCollections,
        isVariants,
        isCategories,
        isParentCollection,
        isSubCollections,
        lang,
        user,
      } = result;

      if (input.title) {
        const inputLangs = Object.keys(input.title);
        inputLangs.forEach((inputLang) => {
          collection.title[inputLang] = input.title[inputLang];
        });
      }

      if (input.description) {
        if (!collection.description) {
          collection.description = input.description;
        } else {
          const inputLangs = Object.keys(input.description);
          inputLangs.forEach((inputLang) => {
            collection.description[inputLang] = input.description[inputLang];
          });
        }
      }

      if (isVariants) {
        collection.productVariants = variants;
      }

      if (isCategories) {
        collection.categories = categories;
      }

      if (input.collectionType) {
        collection.collectionType = input.collectionType;
      }

      if (input.startDate) {
        collection.startDate = input.startDate;
      }

      if (input.endDate) {
        collection.endDate = input.endDate;
      }

      if (isParentCollection) {
        collection.parentCollection = parentCollection;
      }

      if (isSubCollections) {
        const subCollectionsToUpdate: Collection[] = [];

        subCollections.forEach((subCol) => {
          subCol.parentCollection = collection;

          subCollectionsToUpdate.push(subCol);
        });

        await this._collectionRepository.save(subCollectionsToUpdate);
      }

      collection.updatedBy = user;

      await this._collectionRepository.save(collection);

      /**
       * Build the output
       */
      const articles = await this._sharedService.buildCollectionArticlesOutput(
        collection.productVariants,
      );

      const collectionModel: CollectionModel = { collection, articles };

      return new CollectionItemOutput(collectionModel, lang);
    } catch (error) {
      throw new BadRequestException(
        `${EditCollectionService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }

  private async _tryValidation(
    input: EditCollectionInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const collection = await this._collectionRepository.findOne({
        where: { id: input.collectionId },
        relations: [
          'categories',
          'parentCollection',
          'subCollections',
          'productVariants',
        ],
      });

      if (!collection) {
        throw new NotFoundException(
          `Collection with id '${input.collectionId}' not found test`,
        );
      }

      let variants: ProductVariant[] = [];
      let categories: Category[] = [];
      let parentCollection: Collection;
      let subCollections: Collection[] = [];

      if (input.variantIds && input.variantIds.length > 0) {
        variants = await this._productVariantRepository.find({
          where: { id: In(input.variantIds) },
          relations: ['product'],
        });

        if (!variants) {
          throw new NotFoundException(
            `Some product variants among ids '${input.variantIds}' are not found`,
          );
        }
      }

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

      if (!isNullOrWhiteSpace(input.parentCollecctionId)) {
        parentCollection = await this._collectionRepository.findOne({
          where: { id: input.parentCollecctionId },
        });
        if (!parentCollection) {
          throw new NotFoundException(
            `Parent collection with id '${input.parentCollecctionId}' not found`,
          );
        }
      }

      if (input.subCollectionsIds && input.subCollectionsIds.length > 0) {
        subCollections = await this._collectionRepository.findByIds(
          input.subCollectionsIds,
        );
        if (subCollections.length != input.subCollectionsIds.length) {
          throw new NotFoundException(
            `Some subcollections among ids: '${input.subCollectionsIds}' are not found`,
          );
        }

        subCollections.forEach((subCol) => {
          if (
            subCol.parentCollection &&
            subCol.parentCollection.id !== collection.id
          ) {
            throw new HttpException(
              `The category '${subCol.title[lang]}' already have a parent collection`,
              HttpStatus.CONFLICT,
            );
          }
        });
      }

      return {
        collection,
        variants,
        categories,
        parentCollection,
        subCollections,
        isVariants: variants.length > 0,
        isCategories: categories.length > 0,
        isParentCollection: !!parentCollection,
        isSubCollections: subCollections.length > 0,
        lang,
        user,
      };
    } catch (error) {
      throw new BadRequestException(
        `${EditCollectionService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }
}
