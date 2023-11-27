import { BadRequestException } from '@nestjs/common';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator-multi-lang';
import { ProductQuantity } from 'src/domain/interfaces';

export function IsProductQuantity(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isProductQuantity',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      async: false,
      options: validationOptions,
      validator: {
        validate(value: ProductQuantity, args: ValidationArguments) {
          if (!value) {
            throw new BadRequestException(
              `Invalid product quantity input: Empty json`,
            );
          }

          const keys: string[] = [
            'available',
            'discovered',
            'reserved',
            'inTransit',
            'deliveryProcessing',
            'awaitingSAV',
            'delivered',
            'pendingInvestigation',
            'lost',
            'isDead',
          ];

          for (const key in value) {
            if (!keys.find((item) => item === key)) {
              throw new BadRequestException(
                `Invalid product quantity input: incorrect propreties ${key}`,
              );
            }
          }

          const values = Object.values(value);

          for (const val of values) {
            if (typeof val !== 'number') {
              throw new BadRequestException(
                `Invalid product quantity input: each proprety value must be a number`,
              );
            }
          }

          return true;
        },
      },
    });
  };
}
