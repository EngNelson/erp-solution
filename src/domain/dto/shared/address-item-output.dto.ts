import { PositionMap, ValueMap } from '@glosuite/shared';
import { Address } from 'src/domain/entities/shared';

export class AddressItemOutput {
  constructor(address: Address) {
    this.id = address.id;
    this.postalCode = address.postalCode ? address.postalCode : null;
    this.positionRef = address.positionRef ? address.positionRef : null;
    this.positions = address.positions ? address.positions : [];
    this.fullName = address.fullName ? address.fullName : null;
    this.phone = address.phone ? address.phone : null;
    this.email = address.email ? address.email : null;
    this.street = address.street;
    this.quarter = address.quarter;
    this.city = address.city;
    this.region = address.region;
    this.country = address.country;
  }

  id: string;
  postalCode?: number;
  positionRef?: PositionMap;
  positions?: PositionMap[];
  fullName?: string;
  phone?: string;
  email?: string;
  street: ValueMap;
  quarter: ValueMap;
  city: ValueMap;
  region: ValueMap;
  country: ValueMap;
}
