import { BadRequestException } from '@nestjs/common';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator-multi-lang';
import { isTStringInputValue } from '@glosuite/shared';
import { AttributeValueType } from 'src/domain/types/catalog/eav';

export function ArrayContainDefinedAttributeValues(
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'arrayContainDefinedAttributeValues',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      async: false,
      options: validationOptions,
      validator: {
        validate(
          definedValues: AttributeValueType[],
          args: ValidationArguments,
        ) {
          definedValues.forEach((definedValue) => {
            if (!definedValue) {
              throw new BadRequestException(
                `Invalid defined attribute value input: Empty json`,
              );
            }

            if (!definedValue.value) {
              throw new BadRequestException(
                `Invalid defined attribute value: value is required`,
              );
            }

            const props = Object.keys(definedValue);
            props.forEach((prop) => {
              if (
                prop !== 'id' &&
                prop !== 'code' &&
                prop !== 'value' &&
                prop !== 'unitId'
              ) {
                throw new BadRequestException(
                  `Invalid defined attribute value: incorrect propreties ${prop}`,
                );
              }
            });

            const values = Object.values(definedValue);
            values.forEach((val) => {
              if (
                val &&
                !isTStringInputValue(val) &&
                typeof val !== 'string' &&
                typeof val !== 'number'
              ) {
                throw new BadRequestException(
                  `Invalid defined attribute value: Provide TString, string or number`,
                );
              }
            });
          });

          return true;
        },
      },
    });
  };
}
