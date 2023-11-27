import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { Attribute, AttributeValue } from 'src/domain/entities/items/eav';
import {
  AttributeRepository,
  AttributeValueRepository,
} from 'src/repositories/items';
import { RestoreAttributeInput, RestoreAttributeOutput } from './dto';

@Injectable()
export class RestoreAttributeService {
  constructor(
    @InjectRepository(Attribute)
    private readonly _attributeRepository: AttributeRepository,
    @InjectRepository(AttributeValue)
    private readonly _attributeValueRepository: AttributeValueRepository,
  ) {}

  async restoreAttribute(
    input: RestoreAttributeInput,
    user: UserCon,
  ): Promise<RestoreAttributeOutput> {
    const executionResult = await this._tryExecution(input, user);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CONFLICT,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: RestoreAttributeInput,
    user: UserCon,
  ): Promise<RestoreAttributeOutput> {
    try {
      const { attributeId } = input;
      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

      const attribute = await this._attributeRepository.findOne(attributeId, {
        withDeleted: true,
      });
      if (!attribute) {
        throw new NotFoundException(
          `Attribute you are trying to restore is not found`,
        );
      }

      this._attributeRepository.restore(attribute.id);
      attribute.deletedBy = null;
      await this._attributeRepository.save(attribute);

      const attributeValues = await this._attributeValueRepository.find({
        where: { attributeId: attribute.id },
        withDeleted: true,
      });

      attributeValues?.forEach((attrValue) => {
        this._attributeValueRepository.restore(attrValue.id);
        attrValue.deletedBy = null;
      });

      await this._attributeValueRepository.save(attributeValues);

      return new RestoreAttributeOutput(attribute, lang);
    } catch (error) {
      throw new BadRequestException(
        `${RestoreAttributeService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error.message,
      );
    }
  }
}
