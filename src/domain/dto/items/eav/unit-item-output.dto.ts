import { getLangOrFirstAvailableValue, ISOLang } from '@glosuite/shared';
import { Unit } from 'src/domain/entities/items/eav';

export class UnitItemOutput {
  constructor(unit: Unit, lang: ISOLang) {
    this.id = unit.id;
    this.title = getLangOrFirstAvailableValue(unit.title, lang);
    this.symbol = unit.symbol;
    this.createdAt = unit.createdAt;
    this.updatedAt = unit.lastUpdate ? unit.lastUpdate : null;
  }

  id: string;
  title: string;
  symbol: string;
  createdAt: Date;
  updatedAt?: Date;
}
