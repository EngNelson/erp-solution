import { ISOLang } from '@glosuite/shared';
import { StepStatus } from 'src/domain/enums/flows';
import { ItemState } from 'src/domain/enums/items';
import { ProductItemDetails } from 'src/domain/interfaces/items';
import { SupplierItemOutput } from '../purchases';
import {
  ExtraMiniLocationOutput,
  ExtraMiniStoragePointOutput,
} from '../warehouses';

export class ProductItemDetailsOutput {
  constructor(itemDetails: ProductItemDetails, lang: ISOLang) {
    this.id = itemDetails.productItem.id;
    this.reference = itemDetails.productItem.reference;
    this.state = itemDetails.productItem.state;
    this.status = itemDetails.productItem.status;
    this.barcode = itemDetails.productItem.barcode;
    this.purchaseCost = itemDetails.productItem.purchaseCost;
    this.supplier = itemDetails.productItem.supplier
      ? new SupplierItemOutput(itemDetails.productItem.supplier)
      : null;
    this.location = itemDetails.productItem.location
      ? new ExtraMiniLocationOutput(itemDetails.productItem.location)
      : null;
    this.storagePoint = itemDetails.storagePoint
      ? new ExtraMiniStoragePointOutput(itemDetails.storagePoint)
      : null;
    this.createdAt = itemDetails.productItem.createdAt
      ? itemDetails.productItem.createdAt
      : null;
  }

  id: string;
  reference: string;
  state: ItemState;
  status: StepStatus;
  barcode: string;
  purchaseCost: number;
  supplier?: SupplierItemOutput;
  location?: ExtraMiniLocationOutput;
  storagePoint?: ExtraMiniStoragePointOutput;
  createdAt?: Date;
}
