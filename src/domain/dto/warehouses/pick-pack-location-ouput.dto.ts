import { getLangOrFirstAvailableValue, ISOLang } from '@glosuite/shared';
import {
  AvailableStockModel,
  LocationModel,
} from 'src/domain/interfaces/warehouses';

export class PickPackLocationOutput {
  constructor(locationModel: LocationModel, lang: ISOLang) {
    this.id = locationModel.location.id;
    this.storagePoint = locationModel.storagePoint.name;
    this.name = locationModel.location.name;
    this.description = locationModel.location.description
      ? getLangOrFirstAvailableValue(locationModel.location.description, lang)
      : null;
    this.barCode = locationModel.location.barCode;
    this.stock = locationModel.stock;
  }

  id: string;
  storagePoint: string;
  name: string;
  description?: string;
  barCode: string;
  stock: AvailableStockModel;
}
