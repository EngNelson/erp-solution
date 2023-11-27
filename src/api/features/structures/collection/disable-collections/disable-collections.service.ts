import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AgentRoles, ISOLang, Status, UserCon } from '@glosuite/shared';
import { MiniCollectionOutput } from 'src/domain/dto/structures';
import { Collection } from 'src/domain/entities/structures';
import { CollectionRepository } from 'src/repositories/structures';
import { DisableCollectionsInput, DisableCollectionsOutput } from './dto';
import { In } from 'typeorm';

type ValidationResult = {
  collections: Collection[];
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class DisableCollectionsService {
  constructor(
    @InjectRepository(Collection)
    private readonly _collectionRepository: CollectionRepository,
  ) {}

  async disableCollections(
    input: DisableCollectionsInput,
    user: UserCon,
  ): Promise<DisableCollectionsOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CONFLICT,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    validationResult: ValidationResult,
  ): Promise<DisableCollectionsOutput> {
    try {
      const { collections, lang, user } = validationResult;

      const collectionsToDisable: Collection[] = [];
      collections.map((col) => {
        col.status = Status.DISABLED;
        col.disabledBy = user;
        col.disabledAt = new Date();
        collectionsToDisable.push(col);

        col.subCollections.map((subCol) => {
          subCol.status = Status.DISABLED;
          subCol.disabledBy = user;
          subCol.disabledAt = new Date();
          collectionsToDisable.push(subCol);
        });
      });

      await this._collectionRepository.save(collectionsToDisable);

      return new DisableCollectionsOutput(
        collectionsToDisable.map(
          (collection) => new MiniCollectionOutput(collection, lang),
        ),
        collectionsToDisable.length,
      );
    } catch (error) {
      throw new BadRequestException(
        `${DisableCollectionsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: DisableCollectionsInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const collections = await this._collectionRepository.find({
        where: { id: In(input.ids) },
        relations: ['subCollections'],
      });
      if (collections.length !== input.ids.length) {
        throw new NotFoundException(
          `Some collections among ids: '${input.ids}' are not found`,
        );
      }

      const someHaveChildren = collections.some(
        (col) =>
          col.subCollections.length > 0 &&
          col.subCollections.some((subCol) => subCol.status === Status.ENABLED),
      );

      const catsHavingActiveChildren = collections.filter((col) =>
        col.subCollections.some((subCat) => subCat.status === Status.ENABLED),
      );

      if (someHaveChildren) {
        throw new BadRequestException(
          `Cannot disable collection with active sub collections.`,
        );
      }

      console.log(catsHavingActiveChildren);
      console.log(someHaveChildren);

      /**
       * Some collections have products or children having products
       */
      if (
        collections.some(
          (col) =>
            col.productVariants?.length > 0 ||
            col.subCollections.some(
              (subCat) => subCat.productVariants?.length > 0,
            ),
        )
      ) {
        throw new UnauthorizedException(
          `Cannot disable collections having products or children having products`,
        );
      }

      const isUserConHavePrivileges = collections.some(
        (col) =>
          col.createdBy.email != user.email &&
          user.roles.some(
            (role) =>
              role !== AgentRoles.SUPER_ADMIN && role !== AgentRoles.ADMIN,
          ),
      );
      if (isUserConHavePrivileges) {
        throw new UnauthorizedException(
          `You can only disable collections that you have created`,
        );
      }

      return {
        collections,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${DisableCollectionsService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
