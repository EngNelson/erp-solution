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
import { EnableCollectionsInput, EnableCollectionsOutput } from './dto';
import { In } from 'typeorm';

type ValidationResult = {
  collections: Collection[];
  withChildrens?: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class EnableCollectionsService {
  constructor(
    @InjectRepository(Collection)
    private readonly _collectionRepository: CollectionRepository,
  ) {}

  async enableCollections(
    input: EnableCollectionsInput,
    user: UserCon,
  ): Promise<EnableCollectionsOutput> {
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
  ): Promise<EnableCollectionsOutput> {
    try {
      const { collections, withChildrens, lang, user } = validationResult;

      const collectionsToEnable: Collection[] = [];

      collections.map((collection) => {
        collection.status = Status.ENABLED;
        collectionsToEnable.push(collection);

        if (withChildrens) {
          collection.subCollections.map((subCol) => {
            subCol.status = Status.ENABLED;
            collectionsToEnable.push(subCol);
          });
        }
      });

      await this._collectionRepository.save(collectionsToEnable);

      return new EnableCollectionsOutput(
        collectionsToEnable.map(
          (collection) => new MiniCollectionOutput(collection, lang),
        ),
        collectionsToEnable.length,
      );
    } catch (error) {
      throw new BadRequestException(
        `${EnableCollectionsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: EnableCollectionsInput,
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

      const isUserConHavePrivileges = collections.some(
        (col) =>
          col.disabledBy.email != user.email &&
          user.roles.some(
            (role) =>
              role !== AgentRoles.SUPER_ADMIN &&
              role !== AgentRoles.ADMIN &&
              role !== AgentRoles.CONTENT &&
              role !== AgentRoles.CONTENT_MANAGER,
          ),
      );
      if (isUserConHavePrivileges) {
        throw new UnauthorizedException(
          `You can only reactivate collections that you have disable before`,
        );
      }

      return { collections, withChildrens: input.withChildrens, lang, user };
    } catch (error) {
      throw new BadRequestException(
        `${EnableCollectionsService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
