import { BadRequestException } from '@nestjs/common';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { PositionMap } from '@glosuite/shared';

export function IsPositionMap(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isPositionMap',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      async: false,
      options: validationOptions,
      validator: {
        validate(
          value: PositionMap | PositionMap[],
          args: ValidationArguments,
        ) {
          if (Array.isArray(value)) {
            value.forEach((inputVal) => {
              if (!inputVal) {
                throw new BadRequestException(
                  `Invalid PositionMap input. Empty value`,
                );
              }

              if (!inputVal.latitude || !inputVal.longitude) {
                throw new BadRequestException(
                  `Invalid PositionMap input. "latitude" or "longitude" propriety is missing`,
                );
              }

              const keys = Object.keys(inputVal);
              if (
                keys.some((key) => key !== 'latitude' && key !== 'longitude')
              ) {
                throw new BadRequestException(
                  `Invalid PositionMap input. Only "latitude" and "longitude" propreties are allowed`,
                );
              }

              const values = Object.values(inputVal);
              if (values.some((val) => val <= 0 || typeof val !== 'number')) {
                throw new BadRequestException(
                  `Invalid PositionMap input. Both latitude and longitude must be number`,
                );
              }
            });
          } else {
            if (!value) {
              throw new BadRequestException(
                `Invalid PositionMap input. Empty value`,
              );
            }

            if (!value.latitude || !value.longitude) {
              throw new BadRequestException(
                `Invalid PositionMap input. "latitude" or "longitude" propriety is missing`,
              );
            }

            const keys = Object.keys(value);
            if (keys.some((key) => key !== 'latitude' && key !== 'longitude')) {
              throw new BadRequestException(
                `Invalid PositionMap input. Only "latitude" and "longitude" propreties are allowed`,
              );
            }

            const values = Object.values(value);
            if (values.some((val) => val < 0 || typeof val !== 'number')) {
              throw new BadRequestException(
                `Invalid PositionMap input. Both latitude and longitude must be number`,
              );
            }
          }

          return true;
        },
      },
    });
  };
}
