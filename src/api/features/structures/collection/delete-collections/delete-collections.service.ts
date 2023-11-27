import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AgentRoles, Status, UserCon } from '@glosuite/shared';
import { Collection } from 'src/domain/entities/structures';
import {
  CollectionRepository,
  CollectionTreeRepository,
} from 'src/repositories/structures';
import { DeleteCollectionsInput, DeleteCollectionsOutput } from './dto';
import { In } from 'typeorm';

type ValidationResult = {
  collections: Collection[];
  user: UserCon;
};

@Injectable()
export class DeleteCollectionsService {
  constructor(
    @InjectRepository(Collection)
    private readonly _collectionRepository: CollectionRepository,
    @InjectRepository(Collection)
    private readonly _collectionTreeRepository: CollectionTreeRepository,
  ) {}

  async deleteCollections(
    input: DeleteCollectionsInput,
    user: UserCon,
  ): Promise<DeleteCollectionsOutput> {
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

    return new DeleteCollectionsOutput(executionResult.length);
  }

  private async _tryExecution(
    validationResult: ValidationResult,
  ): Promise<Collection[]> {
    try {
      const { collections, user } = validationResult;

      const collectionsToDelete: Collection[] = [];

      collections.map((col) => {
        col.status = Status.DISABLED;
        col.deletedBy = user;
        this._collectionRepository.softDelete(col.id);
        collectionsToDelete.push(col);
      });

      collections.map((col) => {
        col.subCollections?.map((subCol) => {
          subCol.status = Status.DISABLED;
          subCol.deletedBy = user;
          this._collectionRepository.softDelete(subCol.id);
          collectionsToDelete.push(subCol);
        });
      });

      await this._collectionRepository.save(collectionsToDelete);

      return collectionsToDelete;
    } catch (error) {
      throw new ConflictException(
        `${DeleteCollectionsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: DeleteCollectionsInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const collections = await this._collectionRepository.find({
        where: { id: In(input.ids) },
        relations: ['subCollections'],
      });
      if (collections.length !== input.ids.length) {
        throw new NotFoundException(
          `Some categories among ids: '${input.ids}' are not found`,
        );
      }

      let collectionsWithProducts = 0;

      await Promise.all(
        collections.map(async (collection) => {
          const subCollections =
            await this._collectionTreeRepository.findDescendants(collection, {
              relations: ['productVariants'],
            });

          if (
            collection.productVariants?.length > 0 ||
            subCollections?.some((subCol) => subCol.productVariants?.length > 0)
          ) {
            collectionsWithProducts++;
          }
        }),
      );

      if (collectionsWithProducts > 0) {
        throw new BadRequestException(
          `Cannot delete collection containing products or with sub collections containing products.`,
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
          `You can only delete collections that you have created`,
        );
      }

      return {
        collections,
        user,
      };
    } catch (error) {
      throw new BadRequestException(
        `${DeleteCollectionsService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
