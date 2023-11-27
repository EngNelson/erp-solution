import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AttributeType,
  getLangOrFirstAvailableValue,
  isNullOrWhiteSpace,
  ISOLang,
  isTStringInputValue,
  UserCon,
} from '@glosuite/shared';
import { AttributeItemOutput } from 'src/domain/dto/items/eav';
import { Attribute, AttributeValue, Unit } from 'src/domain/entities/items/eav';
import { ValueType } from 'src/domain/enums/items';
import {
  AttributeRepository,
  AttributeValueRepository,
  UnitRepository,
} from 'src/repositories/items';
import { AddAttributeInput } from './dto';

type ValidationResult = {
  units: Unit[];
  isUnits: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class AddAttributeService {
  constructor(
    @InjectRepository(Attribute)
    private readonly _attributeRepository: AttributeRepository,
    @InjectRepository(AttributeValue)
    private readonly _attributeValueRepository: AttributeValueRepository,
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
  ) {}

  async addAttribute(
    input: AddAttributeInput,
    user: UserCon,
  ): Promise<AttributeItemOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(input, validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: AddAttributeInput,
    result: ValidationResult,
  ): Promise<AttributeItemOutput> {
    const attribute = new Attribute();

    try {
      const { units, isUnits, lang, user } = result;

      attribute.name = input.name;
      attribute.type = input.type;
      attribute.valueType = input.valueType;
      attribute.hasUnit = input.hasUnit;

      if (isUnits) {
        attribute.units = units;
      }

      attribute.createdBy = user;

      await this._attributeRepository.save(attribute);

      const attributeValuesToAdd: AttributeValue[] = [];

      if (
        input.definedAttributeValues &&
        input.definedAttributeValues.length > 0
      ) {
        input.definedAttributeValues.map((definedValue) => {
          const attributeValue = new AttributeValue();

          attributeValue.value = definedValue;
          attributeValue.attribute = attribute;
          attributeValue.attributeId = attribute.id;

          if (definedValue.unitId && !isNullOrWhiteSpace(definedValue.unitId)) {
            attributeValue.unitId = definedValue.unitId;
          } else {
            if (isUnits) {
              attributeValue.unitId = units[0].id;
              attributeValue.unit = units[0];
            }
          }

          attributeValue.createdBy = user;

          attributeValuesToAdd.push(attributeValue);
        });
      }

      await this._attributeValueRepository.save(attributeValuesToAdd);

      const output = await this._attributeRepository.findOne(
        { id: attribute.id },
        { relations: ['definedAttributeValues', 'units'] },
      );

      await Promise.all(
        output.definedAttributeValues?.map(async (attributeValue) => {
          attributeValue.unit = await this._unitRepository.findOne(
            attributeValue.unitId,
          );

          return attributeValue;
        }),
      );

      return new AttributeItemOutput(output, lang);
    } catch (error) {
      if (attribute.id) {
        await this._attributeRepository.delete(attribute.id);
      }

      throw new ConflictException(
        `${AddAttributeService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: AddAttributeInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      let units: Unit[] = [];

      if (input.hasUnit && (!input.unitIds || input.unitIds.length === 0)) {
        throw new BadRequestException(
          `Please provide units for this attribute`,
        );
      }

      if (input.unitIds && input.unitIds.length > 0) {
        units = await this._unitRepository.findByIds(input.unitIds);
        if (!units || units.length < input.unitIds.length) {
          throw new NotFoundException(`Some units provided are not found`);
        }
      }

      /**
       * Cannot add more than 1 attribute with valueType COLOR
       */
      if (input.valueType === ValueType.COLOR) {
        const attributeColor = await this._attributeRepository.findOne({
          valueType: ValueType.COLOR,
        });
        if (attributeColor) {
          throw new BadRequestException(
            `An attribute of value type ${
              ValueType.COLOR
            } already exists (${getLangOrFirstAvailableValue(
              attributeColor.name,
              lang,
            )}). You can't create more than one`,
          );
        }
      }

      /**
       * defined attribute values validation
       */
      if (
        (!input.definedAttributeValues ||
          input.definedAttributeValues.length === 0) &&
        (input.valueType === ValueType.COLOR ||
          input.valueType === ValueType.DROPDOWN ||
          input.valueType === ValueType.MULTIPLE_SELECT)
      ) {
        throw new BadRequestException(
          `DefinedAttributeValues are required for ${ValueType.COLOR}, ${ValueType.DROPDOWN} and ${ValueType.MULTIPLE_SELECT} value types`,
        );
      }

      if (
        input.definedAttributeValues &&
        input.definedAttributeValues.length > 0
      ) {
        if (input.unitIds && input.unitIds.length > 1) {
          input.definedAttributeValues.map(async (definedAttrValue) => {
            const { unitId, ...datas } = definedAttrValue;

            if (!unitId) {
              throw new BadRequestException(
                `Please unitId is required in definedAttributeValues for an attribute with more than 2 units`,
              );
            }

            const unit = await this._unitRepository.findOne(unitId);
            if (!unit) {
              throw new NotFoundException(
                `The unit with id ${unitId} is not found`,
              );
            }
          });
        }
      }

      /**
       *
       */
      if (
        input.valueType === ValueType.COLOR &&
        input.type !== AttributeType.OBJECT
      ) {
        throw new BadRequestException(
          `You cannot choose attributeType ${input.type} for ${ValueType.COLOR} values`,
        );
      }

      /**
       * Validation for color
       */
      if (input.valueType === ValueType.COLOR) {
        const areSomeInvalidColorCodes = input.definedAttributeValues.some(
          (definedValue) =>
            isNullOrWhiteSpace(definedValue.code) ||
            definedValue.code === 'string',
        );
        if (areSomeInvalidColorCodes) {
          throw new BadRequestException(
            `Some color code are invalid. Please provide correct code color for ${ValueType.COLOR} values`,
          );
        }

        const areSomeInvalidTStringValues = input.definedAttributeValues.some(
          (definedValue) => !isTStringInputValue(definedValue.value),
        );
        if (areSomeInvalidTStringValues) {
          throw new BadRequestException(
            `Invalid TString input. Some color value are invalid`,
          );
        }
      }

      /**
       * Validation for attributeType = BOOLEAN
       */
      if (
        input.type === AttributeType.BOOLEAN &&
        input.valueType !== ValueType.YES_NO
      ) {
        throw new BadRequestException(
          `The attribute type ${AttributeType.BOOLEAN} can only be associate to ${ValueType.YES_NO} value type`,
        );
      }

      if (
        input.valueType === ValueType.COLOR ||
        input.valueType === ValueType.DROPDOWN ||
        input.valueType === ValueType.MULTIPLE_SELECT
      ) {
        /**
         * Validation for attributeType = NUMBER
         */
        if (input.type === AttributeType.NUMBER) {
          const areSomeValuesNotNumber = input.definedAttributeValues?.some(
            (definedValue) => typeof definedValue.value !== 'number',
          );
          if (areSomeValuesNotNumber) {
            throw new BadRequestException(
              `Some attribute defined values are not number. Please provide only number values for ${AttributeType.NUMBER} attribute type`,
            );
          }
        }

        /**
         * Validation for attributeType = STRING
         */
        if (input.type === AttributeType.STRING) {
          const areSomeValuesNotString = input.definedAttributeValues?.some(
            (definedValue) => typeof definedValue.value !== 'string',
          );
          if (areSomeValuesNotString) {
            throw new BadRequestException(
              `Some attribute values are not string. Please provide only string values for ${AttributeType.STRING} attribute type`,
            );
          }
        }
      }

      if (
        input.valueType !== ValueType.COLOR &&
        input.valueType !== ValueType.DROPDOWN &&
        input.valueType !== ValueType.MULTIPLE_SELECT &&
        input.definedAttributeValues?.length > 0
      ) {
        throw new BadRequestException(
          `Don't need defined attribute values for ${input.valueType}`,
        );
      }

      return { units, isUnits: units.length > 0, lang, user };
    } catch (error) {
      throw new BadRequestException(
        `${AddAttributeService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }
}
