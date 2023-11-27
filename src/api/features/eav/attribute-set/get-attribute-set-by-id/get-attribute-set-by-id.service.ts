import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isNullOrWhiteSpace, ISOLang, UserCon } from '@glosuite/shared';
import { AttributeSetItemOutput } from 'src/domain/dto/items/eav';
import {
  Attribute,
  AttributeOption,
  AttributeSet,
  Unit,
} from 'src/domain/entities/items/eav';
import {
  AttributeOptionRepository,
  AttributeRepository,
  AttributeSetRepository,
  UnitRepository,
} from 'src/repositories/items';
import { GetAttributeSetByIdInput } from './dto';

@Injectable()
export class GetAttributeSetByIdService {
  constructor(
    @InjectRepository(AttributeSet)
    private readonly _attributeSetRepository: AttributeSetRepository,
    @InjectRepository(AttributeOption)
    private readonly _attributeOptionRepository: AttributeOptionRepository,
    @InjectRepository(Attribute)
    private readonly _attributeRepository: AttributeRepository,
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
  ) {}

  async getAttributeSetById(
    input: GetAttributeSetByIdInput,
    user: UserCon,
  ): Promise<AttributeSetItemOutput> {
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
    input: GetAttributeSetByIdInput,
    user: UserCon,
  ): Promise<AttributeSetItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const attributeSet = await this._attributeSetRepository.findOne(
        input.attributeSetId,
        { relations: ['options'] },
      );

      if (!attributeSet) {
        throw new NotFoundException(
          `Attribute-set with id '${input.attributeSetId}' not found`,
        );
      }

      const attributeSetOptions = await this._attributeOptionRepository.find({
        where: { attributeSetId: attributeSet.id },
        relations: ['attribute'],
      });

      await Promise.all(
        attributeSetOptions.map(async (attributeSetOption) => {
          attributeSetOption.attribute =
            await this._attributeRepository.findOne(
              attributeSetOption.attribute.id,
              { relations: ['units', 'definedAttributeValues'] },
            );

          await Promise.all(
            attributeSetOption.attribute.definedAttributeValues.map(
              async (definedValue) => {
                if (!isNullOrWhiteSpace(definedValue.unitId)) {
                  definedValue.unit = await this._unitRepository.findOneOrFail(
                    definedValue.unitId,
                  );

                  return definedValue;
                }
              },
            ),
          );

          return attributeSetOption;
        }),
      );

      return new AttributeSetItemOutput(
        attributeSet,
        lang,
        attributeSetOptions,
      );
    } catch (error) {
      throw new BadRequestException(
        `${GetAttributeSetByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
