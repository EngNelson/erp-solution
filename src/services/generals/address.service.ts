import { ValueMap } from '@glosuite/shared';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AddressService {
  generateValueMapValue(name: string, code?: string): ValueMap {
    const value: ValueMap = {
      code,
      name,
    };

    return value;
  }
}
