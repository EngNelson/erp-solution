import { BadRequestException } from '@nestjs/common';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator-multi-lang';
import { isNullOrWhiteSpace, ISOLang } from '@glosuite/shared';

export function IsISOLang(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isISOLang',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      async: false,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) {
            throw new BadRequestException(`Please provide the language`);
          }
          const isArray = Array.isArray(value);

          if (!isArray && typeof value !== 'string') {
            throw new BadRequestException(`Invalid ISOLang input: ${value}`);
          }

          const data: string[] = isArray ? value : [value];
          const lng = data.length;

          for (let i = 0; i < lng; i++) {
            const val = data[i];

            if (!val) {
              throw new BadRequestException(`Invalid ISOLang input`);
            }

            const strVal = val.toString().toUpperCase();
            const lang = ISOLang[strVal];

            if (isNullOrWhiteSpace(strVal) || !lang) {
              throw new BadRequestException(`Invalid ISOLang input`);
            }

            data[i] = lang;
          }
          return true;
        },
      },
    });
  };
}
