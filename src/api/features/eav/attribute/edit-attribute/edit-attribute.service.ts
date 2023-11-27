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
import { AttributeDefinedValueModel } from 'src/domain/interfaces/eav';
import { AttributeValueType } from 'src/domain/types/catalog/eav';
import {
  AttributeRepository,
  AttributeValueRepository,
  UnitRepository,
} from 'src/repositories/items';
import { EditAttributeInput } from './dto';

type ValidationResult = {
  attribute: Attribute;
  definedValuesToDelete: AttributeValue[];
  definedValuesToEdit: AttributeDefinedValueModel[];
  definedValuesToAdd: AttributeDefinedValueModel[];
  units: Unit[];
  isDefinedValuesToDelete: boolean;
  isDefinedValuesToEdit: boolean;
  isDefinedValuesToAdd: boolean;
  isUnit: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class EditAttributeService {
  constructor(
    @InjectRepository(Attribute)
    private readonly _attributeRepository: AttributeRepository,
    @InjectRepository(AttributeValue)
    private readonly _attributeValueRepository: AttributeValueRepository,
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
  ) {}

  async editAttribute(
    input: EditAttributeInput,
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
    input: EditAttributeInput,
    result: ValidationResult,
  ): Promise<AttributeItemOutput> {
    try {
      const {
        attribute,
        definedValuesToDelete,
        definedValuesToEdit,
        definedValuesToAdd,
        units,
        isDefinedValuesToDelete,
        isDefinedValuesToEdit,
        isDefinedValuesToAdd,
        isUnit,
        lang,
        user,
      } = result;

      if (input.name) {
        const inputLangs = Object.keys(input.name);
        inputLangs.forEach((l) => {
          attribute.name[l] = input.name[l];
        });
      }

      if (isDefinedValuesToDelete) {
        definedValuesToDelete.map((definedValueToDelete) => {
          this._attributeValueRepository.delete(definedValueToDelete.id);
          this._attributeValueRepository.save(definedValueToDelete);
        });
      }

      // const attributeValues: AttributeValue[] = []
      const definedAttributeValuesToEdit: AttributeValue[] = [];
      const definedAttributeValuesToAdd: AttributeValue[] = [];

      if (isDefinedValuesToEdit) {
        await Promise.all(
          definedValuesToEdit.map(async (definedValueToEdit) => {
            const { id, code, value, unit } = definedValueToEdit;

            const actualDefinedValue =
              await this._attributeValueRepository.findOne(id);

            actualDefinedValue.value = { code, value };
            actualDefinedValue.attributeId = attribute.id;
            actualDefinedValue.attribute = attribute;

            if (unit) {
              actualDefinedValue.unit = unit;
              actualDefinedValue.unitId = unit.id;
            }

            actualDefinedValue.updatedBy = user;

            definedAttributeValuesToEdit.push(actualDefinedValue);
          }),
        );
      }

      if (isDefinedValuesToAdd) {
        definedValuesToAdd.map(async (definedValueInput) => {
          const definedValueToAdd = new AttributeValue();

          definedValueToAdd.attribute = attribute;
          definedValueToAdd.attributeId = attribute.id;
          definedValueToAdd.value = {
            code: definedValueInput.code,
            value: definedValueInput.value,
          };

          if (definedValueInput.unit) {
            definedValueToAdd.unitId = definedValueInput.unit.id;
            definedValueToAdd.unit = definedValueInput.unit;
          }

          definedValueToAdd.createdBy = user;
          definedAttributeValuesToAdd.push(definedValueToAdd);
        });
      }

      if (isUnit) {
        attribute.units = units;
        attribute.hasUnit = true;
      }

      attribute.updatedBy = user;

      await this._attributeRepository.save(attribute);

      if (definedAttributeValuesToEdit.length > 0) {
        await this._attributeValueRepository.save(definedAttributeValuesToEdit);
      }

      if (definedAttributeValuesToAdd.length > 0) {
        await this._attributeValueRepository.save(definedAttributeValuesToAdd);
      }

      const output = await this._attributeRepository.findOne(
        { id: attribute.id },
        { relations: ['definedAttributeValues', 'units'] },
      );

      await Promise.all(
        output.definedAttributeValues?.map(async (attributeValue) => {
          if (!isNullOrWhiteSpace(attributeValue.unitId)) {
            attributeValue.unit = await this._unitRepository.findOne(
              attributeValue.unitId,
            );
          }

          return attributeValue;
        }),
      );

      return new AttributeItemOutput(output, lang);
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${EditAttributeService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: EditAttributeInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const attribute = await this._attributeRepository.findOne(
        input.attributeId,
        {
          relations: ['definedAttributeValues'],
        },
      );
      if (!attribute) {
        throw new NotFoundException(`Attribute to edit not found`);
      }

      /**
       * defined attribute values validation
       */
      if (
        (!input.newDefinedAttributeValues ||
          input.newDefinedAttributeValues.length === 0) &&
        (attribute.valueType === ValueType.COLOR ||
          attribute.valueType === ValueType.DROPDOWN ||
          attribute.valueType === ValueType.MULTIPLE_SELECT)
      ) {
        throw new BadRequestException(
          `DefinedAttributeValues are required for ${ValueType.COLOR}, ${ValueType.DROPDOWN} and ${ValueType.MULTIPLE_SELECT} value types`,
        );
      }

      /**
       * Validation for color
       */
      if (attribute.valueType === ValueType.COLOR) {
        const areSomeInvalidColorCodes = input.newDefinedAttributeValues.some(
          (definedValue) =>
            isNullOrWhiteSpace(definedValue.code) ||
            definedValue.code === 'string',
        );
        if (areSomeInvalidColorCodes) {
          throw new BadRequestException(
            `Some color code are invalid. Please provide correct color code for ${ValueType.COLOR} values`,
          );
        }

        const areSomeInvalidTStringValues =
          input.newDefinedAttributeValues.some(
            (definedValue) => !isTStringInputValue(definedValue.value),
          );
        if (areSomeInvalidTStringValues) {
          throw new BadRequestException(
            `Invalid TString input. Some color values are invalid`,
          );
        }
      }

      if (
        attribute.valueType === ValueType.COLOR ||
        attribute.valueType === ValueType.DROPDOWN ||
        attribute.valueType === ValueType.MULTIPLE_SELECT
      ) {
        /**
         * Validation for attributeType = NUMBER
         */
        if (attribute.type === AttributeType.NUMBER) {
          const areSomeValuesNotNumber = input.newDefinedAttributeValues?.some(
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
        if (attribute.type === AttributeType.STRING) {
          const areSomeValuesNotString = input.newDefinedAttributeValues?.some(
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
        attribute.valueType !== ValueType.COLOR &&
        attribute.valueType !== ValueType.DROPDOWN &&
        attribute.valueType !== ValueType.MULTIPLE_SELECT &&
        input.newDefinedAttributeValues?.length > 0
      ) {
        throw new BadRequestException(
          `Don't need defined attribute values for ${attribute.valueType}`,
        );
      }

      const definedValuesToDelete: AttributeValue[] = [];
      const definedValuesToEdit: AttributeDefinedValueModel[] = [];
      const definedValuesToAdd: AttributeDefinedValueModel[] = [];
      const errors: string[] = [];

      if (
        input.newDefinedAttributeValues &&
        input.newDefinedAttributeValues.length > 0
      ) {
        await Promise.all(
          input.newDefinedAttributeValues?.map(async (definedValue) => {
            const { id, code, value, unitId } = definedValue;

            if (attribute.units?.length > 0 && isNullOrWhiteSpace(unitId)) {
              errors.push(
                `Please provide unit for the defined value '${value}'`,
              );
            }

            let unit: Unit;
            if (!isNullOrWhiteSpace(unitId)) {
              unit = await this._unitRepository.findOne(unitId);

              if (!unit) {
                errors.push(`The unit of id ${unitId} is not found`);
              }
            }

            // Build definedValuesToEdit
            if (!isNullOrWhiteSpace(id)) {
              const attributeValue =
                await this._attributeValueRepository.findOne(id);
              if (!attributeValue) {
                errors.push(
                  `The defined attribute value with id ${id} is not found`,
                );
              }

              if (
                !attribute.definedAttributeValues.some(
                  (definedValueFromDB) =>
                    definedValueFromDB.id === definedValue.id,
                )
              ) {
                errors.push(
                  `The defined attribute value with id ${
                    definedValue.id
                  } is not an old ${getLangOrFirstAvailableValue(
                    attribute.name,
                    lang,
                  )} attribute defined values`,
                );
              }

              definedValuesToEdit.push({ id, code, value, unit });
            } else {
              // Build definedValuesToAdd
              definedValuesToAdd.push({ code, value, unit });
            }
          }),
        );

        if (errors.length > 0) {
          throw new NotFoundException(errors[0]);
        }

        // Build definedValuesToDelete
        attribute.definedAttributeValues?.map((definedAttributeValue) => {
          if (
            !input.newDefinedAttributeValues.some(
              (newDefinedValue) =>
                definedAttributeValue.id === newDefinedValue.id,
            )
          ) {
            definedValuesToDelete.push(definedAttributeValue);
          }
        });
      }

      /**
       * Unit validation
       */
      let units: Unit[] = [];

      if (input.unitIds && input.unitIds.length > 0) {
        units = await this._unitRepository.findByIds(input.unitIds);
        if (!units || units.length < input.unitIds.length) {
          throw new NotFoundException(`Some units provided are not found`);
        }
      }

      return {
        attribute,
        definedValuesToDelete,
        definedValuesToEdit,
        definedValuesToAdd,
        units,
        isDefinedValuesToDelete: definedValuesToDelete.length > 0,
        isDefinedValuesToEdit: definedValuesToEdit.length > 0,
        isDefinedValuesToAdd: definedValuesToAdd.length > 0,
        isUnit: units.length > 0,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${EditAttributeService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }
}
