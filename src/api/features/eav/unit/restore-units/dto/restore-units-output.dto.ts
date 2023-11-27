import { getLangOrFirstAvailableValue, ISOLang } from '@glosuite/shared';
import { Unit } from 'src/domain/entities/items/eav';

export class RestoreUnitsOutput {
  items: RestoreUnitsOutputItems[];
  totalItemsRestored: number;

  constructor(items: RestoreUnitsOutputItems[], totalItemsRestored: number) {
    this.items = items;
    this.totalItemsRestored = totalItemsRestored;
  }
}

export class RestoreUnitsOutputItems {
  constructor(unit: Unit, lang: ISOLang) {
    this.id = unit.id;
    this.title = getLangOrFirstAvailableValue(unit.title, lang);
    this.symbol = unit.symbol;
  }

  id: string;
  title: string;
  symbol: string;
}
