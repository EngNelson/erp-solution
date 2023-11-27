import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserCon } from '@glosuite/shared';
import { DeleteAreaService } from 'src/api/features/warehouses/area/delete-area/delete-area.service';
import { Attribute, AttributeValue } from 'src/domain/entities/items/eav';
import {
  AttributeRepository,
  AttributeValueRepository,
} from 'src/repositories/items';
import { DeleteAttributeInput } from './dto';

type ValidationResult = {
  attribute: Attribute;
  user: UserCon;
};

@Injectable()
export class DeleteAttributeService {
  constructor(
    @InjectRepository(Attribute)
    private readonly _attributeRepository: AttributeRepository,
    @InjectRepository(AttributeValue)
    private readonly _attributeValueRepository: AttributeValueRepository,
  ) {}

  async deleteAttribute(
    input: DeleteAttributeInput,
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

  private async _tryExecution(result: ValidationResult): Promise<Attribute> {
    try {
      const { attribute, user } = result;

      const attributeValuesToDelete = await this._attributeValueRepository.find(
        { where: { attributeId: attribute.id } },
      );

      attribute.deletedBy = user;
      this._attributeRepository.softDelete(attribute.id);
      this._attributeRepository.save(attribute);

      attributeValuesToDelete.forEach((attrValue) => {
        attrValue.deletedBy = user;
        this._attributeValueRepository.softDelete(attrValue.id);
        this._attributeValueRepository.save(attrValue);
      });

      return attribute;
    } catch (error) {
      throw new ConflictException(
        `${DeleteAreaService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: DeleteAttributeInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const attribute = await this._attributeRepository.findOne(
        input.attributeId,
        { relations: ['options', 'variantAttributeValues'] },
      );
      if (!attribute) {
        throw new NotFoundException(
          `Attribute with id '${input.attributeId}' not found`,
        );
      }

      /**
       * On verifi si l'attribut a supprimer est
       * dans au moins un attribute-set
       */
      if (attribute.options.length > 0) {
        throw new BadRequestException(
          `You cannot delete an attribute already in an attribute set`,
        );
      }

      /**
       * On verifi si l'attribut a supprimer est
       * deja lie a un productVariant
       */
      if (attribute.variantAttributeValues.length > 0) {
        throw new BadRequestException(
          `You cannot delete an attribute already related to a product variant`,
        );
      }

      return { attribute, user };
    } catch (error) {
      throw new BadRequestException(
        `${DeleteAttributeService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
