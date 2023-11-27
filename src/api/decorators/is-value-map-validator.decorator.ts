import { BadRequestException } from '@nestjs/common';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { ValueMap } from '@glosuite/shared';

export function IsValueMap(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValueMap',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      async: false,
      options: validationOptions,
      validator: {
        validate(value: ValueMap, args: ValidationArguments) {
          if (!value) {
            throw new BadRequestException(
              `Invalid value-map input: Empty json`,
            );
          }

          if (!value.name) {
            throw new BadRequestException(
              `Invalid value-map: name is required`,
            );
          }

          const props = Object.keys(value);
          if (props.some((prop) => prop !== 'code' && prop !== 'name')) {
            throw new BadRequestException(
              `Invalid value-map input: incorrect propreties ${props}`,
            );
          }

          const values = Object.values(value);

          const isSomeValuesAreNotString = values.some(
            (val) => val !== undefined && typeof val !== 'string',
          );

          if (isSomeValuesAreNotString) {
            throw new BadRequestException(
              `Invalid value-map input: code and name must be string`,
            );
          }

          return true;
        },
      },
    });
  };
}
