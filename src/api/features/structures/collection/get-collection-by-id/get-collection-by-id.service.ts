import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { CollectionItemOutput } from 'src/domain/dto/structures';
import { Collection } from 'src/domain/entities/structures';
import { CollectionModel } from 'src/domain/interfaces/structures';
import { CollectionRepository } from 'src/repositories/structures';
import { SharedService } from 'src/services/utilities';
import { GetCollectionByIdInput } from './dto';

type ValidationResult = {
  collection: Collection;
  lang: ISOLang;
};

@Injectable()
export class GetCollectionByIdService {
  constructor(
    @InjectRepository(Collection)
    private readonly _collectionRepository: CollectionRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async getCollectionById(
    input: GetCollectionByIdInput,
    user: UserCon,
  ): Promise<CollectionItemOutput> {
    const validationResult = await this._tryExecution(input, user);
    const { collection, lang } = validationResult;

    const articles = await this._sharedService.buildCollectionArticlesOutput(
      collection.productVariants,
    );

    const collectionModel: CollectionModel = { collection, articles };

    return new CollectionItemOutput(collectionModel, lang);
  }

  private async _tryExecution(
    input: GetCollectionByIdInput,
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
          `Collection with id '${input.collectionId}' not found`,
        );
      }

      return {
        collection,
        lang,
      };
    } catch (error) {
      throw new BadRequestException(
        `${GetCollectionByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
