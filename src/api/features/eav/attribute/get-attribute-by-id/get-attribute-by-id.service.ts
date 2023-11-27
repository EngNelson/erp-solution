import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isNullOrWhiteSpace, ISOLang, UserCon } from '@glosuite/shared';
import { AttributeItemOutput } from 'src/domain/dto/items/eav';
import { Attribute, Unit } from 'src/domain/entities/items/eav';
import { AttributeRepository, UnitRepository } from 'src/repositories/items';
import { GetAttributeByIdInput } from './dto';

@Injectable()
export class GetAttributeByIdService {
  constructor(
    @InjectRepository(Attribute)
    private readonly _attributeRepository: AttributeRepository,
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
  ) {}

  async getAttributeById(
    input: GetAttributeByIdInput,
    user: UserCon,
  ): Promise<AttributeItemOutput> {
    const result = await this._tryExecution(input, user);

    if (!result) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return result;
  }

  private async _tryExecution(
    input: GetAttributeByIdInput,
    user: UserCon,
  ): Promise<AttributeItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const attribute = await this._attributeRepository.findOne(
        input.attributeId,
        { relations: ['units', 'definedAttributeValues'] },
      );

      if (!attribute) {
        throw new NotFoundException(
          `Attribute with id '${input.attributeId}' not found`,
        );
      }

      await Promise.all(
        attribute.definedAttributeValues?.map(async (definedAttributeValue) => {
          if (!isNullOrWhiteSpace(definedAttributeValue.unitId)) {
            definedAttributeValue.unit = await this._unitRepository.findOne(
              definedAttributeValue.unitId,
            );
          }

          return definedAttributeValue;
        }),
      );

      return new AttributeItemOutput(attribute, lang);
    } catch (error) {
      throw new BadRequestException(
        `${GetAttributeByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
