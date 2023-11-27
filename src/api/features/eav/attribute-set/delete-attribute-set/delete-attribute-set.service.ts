import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserCon } from '@glosuite/shared';
import { AttributeSet } from 'src/domain/entities/items/eav';
import { AttributeSetRepository } from 'src/repositories/items';
import { DeleteAttributeSetInput } from './dto';

type ValidationResult = {
  attributeSet: AttributeSet;
  user: UserCon;
};

@Injectable()
export class DeleteAttributeSetService {
  constructor(
    @InjectRepository(AttributeSet)
    private readonly _attributeSetRepository: AttributeSetRepository,
  ) {}

  async deleteAttributeSet(
    input: DeleteAttributeSetInput,
    user: UserCon,
  ): Promise<boolean> {
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

    return !!executionResult;
  }

  private async _tryExecution(result: ValidationResult): Promise<AttributeSet> {
    try {
      const { attributeSet, user } = result;

      attributeSet.deletedBy = user;

      this._attributeSetRepository.softDelete(attributeSet.id);
      this._attributeSetRepository.save(attributeSet);

      return attributeSet;
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${DeleteAttributeSetService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: DeleteAttributeSetInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const attributeSet = await this._attributeSetRepository.findOne(
        input.attributeSetId,
        { relations: ['products', 'categories', 'options'] },
      );

      if (!attributeSet) {
        throw new NotFoundException(
          `Attribute set with id '${input.attributeSetId}' not found`,
        );
      }

      // console.log(attributeSet);

      // throw new BadRequestException('debug');

      /**
       * Is attribute set related to at least one attribute
       */
      if (attributeSet.options && attributeSet.options.length > 0) {
        throw new NotAcceptableException(
          `You cannot delete an attribute set already related to at least one attribute`,
        );
      }

      /**
       * Is attribute set related to at least one product
       */
      if (attributeSet.products && attributeSet.products.length > 0) {
        throw new NotAcceptableException(
          `You cannot delete an attribute set already related to at least one product`,
        );
      }

      /**
       * Is attribute set related to at least one category
       */
      if (attributeSet.categories && attributeSet.categories.length > 0) {
        throw new NotAcceptableException(
          `You cannot delete an attribute set already related to at least one category`,
        );
      }

      return { attributeSet, user };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${DeleteAttributeSetService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
