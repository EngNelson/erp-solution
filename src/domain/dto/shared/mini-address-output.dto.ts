import { ValueMap } from '@glosuite/shared';
import { Address } from '../../entities/shared';

export class MiniAddressOutput {
  constructor(address: Address) {
    this.id = address.id;
    this.fullName = address.fullName ? address.fullName : null;
    this.phone = address.phone ? address.phone : null;
    this.email = address.email ? address.email : null;
    this.postalCode = address.postalCode ? address.postalCode : null;
    this.street = address.street;
    this.quarter = address.quarter;
    this.city = address.city;
  }

  id: string;
  fullName?: string;
  phone?: string;
  email?: string;
  postalCode?: number;
  street: ValueMap;
  quarter: ValueMap;
  city: ValueMap;
}

export class ExtraMiniAddressOutput {
  constructor(address: Address) {
    this.id = address.id;
    this.city = address.city;
  }

  id: string;
  city: ValueMap;
}
