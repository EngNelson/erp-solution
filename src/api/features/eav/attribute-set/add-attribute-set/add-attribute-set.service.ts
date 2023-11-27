import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import {
  Attribute,
  AttributeOption,
  AttributeSet,
} from 'src/domain/entities/items/eav';
import { AttributeOptionModel } from 'src/domain/types/catalog/eav';
import {
  AttributeOptionRepository,
  AttributeRepository,
  AttributeSetRepository,
} from 'src/repositories/items';
import { AddAttributeSetInput, AddAttributeSetOutput } from './dto';

type ValidationResult = {
  attributeOptionValues: AttributeOptionModel[];
  isAttributeOption: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class AddAttributeSetService {
  constructor(
    @InjectRepository(AttributeSet)
    private readonly _attributeSetRepository: AttributeSetRepository,
    @InjectRepository(Attribute)
    private readonly _attributeRepository: AttributeRepository,
    @InjectRepository(AttributeOption)
    private readonly _attributeOptionRepository: AttributeOptionRepository,
  ) {}

  async addAttributeSet(
    input: AddAttributeSetInput,
    user: UserCon,
  ): Promise<AddAttributeSetOutput> {
    const result = await this._tryValidation(input, user);

    if (!result) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(input, result);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: AddAttributeSetInput,
    result: ValidationResult,
  ): Promise<AddAttributeSetOutput> {
    const attributeSet = new AttributeSet();

    try {
      const { attributeOptionValues, isAttributeOption, lang, user } = result;
      const { title, description, ...datas } = input;

      attributeSet.title = title;
      attributeSet.description = description;
      attributeSet.createdBy = user;

      await this._attributeSetRepository.save(attributeSet);

      /**
       * Save attribute options
       */
      const optionsToAdd: AttributeOption[] = [];
      if (isAttributeOption) {
        attributeOptionValues.map((attrOption) => {
          const attributeOptionItem = new AttributeOption();

          attributeOptionItem.attribute = attrOption.attribute;
          attributeOptionItem.attributeId = attrOption.attribute.id;

          attributeOptionItem.required = attrOption.required;
          attributeOptionItem.attributeSet = attributeSet;
          attributeOptionItem.attributeSetId = attributeSet.id;

          attributeOptionItem.createdBy = user;

          optionsToAdd.push(attributeOptionItem);
        });

        await this._attributeOptionRepository.save(optionsToAdd);
      }

      return new AddAttributeSetOutput(attributeSet, lang, optionsToAdd);
    } catch (error) {
      if (attributeSet.id) {
        await this._attributeSetRepository.delete(attributeSet.id);
      }
      throw new ConflictException(
        `${AddAttributeSetService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: AddAttributeSetInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const { title, description, attributeOptions } = input;

      const attributeOptionValues: AttributeOptionModel[] = [];
      if (attributeOptions && attributeOptions.length > 0) {
        await Promise.all(
          attributeOptions.map(async (option) => {
            const attribute = await this._attributeRepository.findOne(
              {
                id: option.attributeId,
              },
              { relations: ['units', 'definedAttributeValues'] },
            );
            if (!attribute) {
              throw new NotFoundException(`Some attributes are not found`);
            }

            if (
              !attributeOptionValues.find(
                (attributeOptionValue) =>
                  attributeOptionValue.attribute.id === attribute.id,
              )
            ) {
              attributeOptionValues.push({
                attribute,
                required: option.required,
              });
            }
          }),
        );
      }

      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

      return {
        attributeOptionValues,
        isAttributeOption: attributeOptionValues.length > 0,
        lang,
        user,
      };
    } catch (error) {
      throw new BadRequestException(
        `${AddAttributeSetService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
