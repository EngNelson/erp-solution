import { BadRequestException } from '@nestjs/common';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator-multi-lang';
import { isNullOrWhiteSpace, ISOLang, TString } from '@glosuite/shared';

export function IsTStringInput(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isTStringInput',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      async: false,
      options: validationOptions,
      validator: {
        validate(value: TString, args: ValidationArguments) {
          if (!value) {
            throw new BadRequestException(`Invalid TString input`);
          }

          const keys = Object.keys(value);
          const len = keys.length;

          if (len === 0) {
            throw new BadRequestException(
              `Invalid TString input: empty json input`,
            );
          }

          for (let i = 0; i < len; i++) {
            const key = keys[i];
            const val = value[key];

            if (
              !val ||
              !key ||
              !ISOLang[key.toUpperCase()] ||
              isNullOrWhiteSpace(val)
            ) {
              throw new BadRequestException(
                `Invalid TString input: error on json or language not supported: (${key})`,
              );
            }
          }

          return true;
        },
      },
    });
  };
}
