import { getLangOrFirstAvailableValue, ISOLang } from '@glosuite/shared';
import { MobileUnitStatus } from 'src/domain/enums/flows';
import { MobileUnitModel } from 'src/domain/interfaces/flows/transfert';
import {
  ProductItemInMobileUnitItemOutput,
  ProductItemItemOutput,
} from '../items';

export class MobileUnitItemOutput {
  constructor(mobileUnitModel: MobileUnitModel, lang: ISOLang) {
    this.id = mobileUnitModel.mobileUnit.id;
    this.reference = mobileUnitModel.mobileUnit.reference;
    this.name = mobileUnitModel.mobileUnit.name;
    this.description = mobileUnitModel.mobileUnit.description
      ? getLangOrFirstAvailableValue(
          mobileUnitModel.mobileUnit.description,
          lang,
        )
      : null;
    this.password = mobileUnitModel.mobileUnit.password
      ? mobileUnitModel.mobileUnit.password
      : null;
    this.status = mobileUnitModel.mobileUnit.status;
    // this.transfert = new MiniTransfertOutputTransfertOutput(
    //   mobileUnitModel.mobileUnit.transfert,
    //   lang,
    // );
    this.items = mobileUnitModel.mobileUnit.productItems
      ? mobileUnitModel.mobileUnit.productItems.map(
          (item) => new ProductItemItemOutput(item, lang),
        )
      : [];
    this.itemsScanned =
      mobileUnitModel.itemsScanned.length > 0
        ? mobileUnitModel.itemsScanned.map(
            (item) => new ProductItemInMobileUnitItemOutput(item, lang),
          )
        : [];
    this.createdAt = mobileUnitModel.mobileUnit.createdAt;
    this.lastUpdate = mobileUnitModel.mobileUnit.lastUpdate
      ? mobileUnitModel.mobileUnit.lastUpdate
      : null;
  }

  id: string;
  reference: string;
  name: string;
  description?: string;
  password?: string;
  status: MobileUnitStatus;
  // transfert: MiniTransfertOutputTransfertOutput;
  items: ProductItemItemOutput[];
  itemsScanned?: ProductItemInMobileUnitItemOutput[];
  createdAt: Date;
  lastUpdate?: Date;
}
