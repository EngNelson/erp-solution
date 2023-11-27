export class ImportEavAndSuppliersOutput {
  constructor(
    units: number,
    attributes: number,
    attributeSets: number,
    suppliers: number,
  ) {
    this.units = units;
    this.attributes = attributes;
    this.attributeSets = attributeSets;
    this.suppliers = suppliers;
  }

  units: number;
  attributes: number;
  attributeSets: number;
  suppliers: number;
}
