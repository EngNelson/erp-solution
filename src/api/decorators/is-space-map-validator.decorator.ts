import { BadRequestException } from '@nestjs/common';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator-multi-lang';
import { SpaceMap } from '@glosuite/shared';

export function IsSpaceMap(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isSpaceMap',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      async: false,
      options: validationOptions,
      validator: {
        validate(value: SpaceMap, args: ValidationArguments) {
          if (!value) {
            throw new BadRequestException(
              `Invalid space-map input: Empty json`,
            );
          }

          if (!value.length || !value.width) {
            throw new BadRequestException(
              `Invalid space-map: length and width are required`,
            );
          }

          for (const prop in value) {
            if (prop !== 'height' && prop !== 'length' && prop !== 'width') {
              throw new BadRequestException(
                `Invalid space-map input: incorrect propreties '${prop}'`,
              );
            }
          }

          const values = Object.values(value);

          const isSomeValuesNotNumber = values.some(
            (val) => val !== undefined && (val < 0 || typeof val !== 'number'),
          );

          if (isSomeValuesNotNumber) {
            throw new BadRequestException(
              `Invalid space-map input: length, width and height must be numbers`,
            );
          }

          return true;
        },
      },
    });
  };
}
