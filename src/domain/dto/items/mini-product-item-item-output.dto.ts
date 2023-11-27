import { ProductItem } from 'src/domain/entities/items';
import { StepStatus } from 'src/domain/enums/flows';
import { ItemState } from 'src/domain/enums/items';
import { ProductItemDetails } from 'src/domain/interfaces/items';
import { ExtraMiniStoragePointOutput } from '../warehouses';

export class MiniProductItemItemOutput {
  constructor(productItem: ProductItem) {
    this.id = productItem.id;
    this.reference = productItem.reference;
    this.barCode = productItem.barcode;
    this.purchaseCost = productItem.purchaseCost;
    this.state = productItem.state;
    this.status = productItem.status;
    this.cost = productItem.purchaseCost ? productItem.purchaseCost : null;
    this.createdAt = productItem.createdAt;
  }

  id: string;
  reference: string;
  barCode: string;
  purchaseCost: number;
  state: ItemState;
  status: StepStatus;
  cost?: number;
  createdAt: Date;
}

export class GetVariantsProductItemOutput {
  constructor(itemDetails: ProductItemDetails) {
    this.id = itemDetails.productItem.id;
    this.reference = itemDetails.productItem.reference;
    this.barCode = itemDetails.productItem.barcode;
    this.state = itemDetails.productItem.state;
    this.status = itemDetails.productItem.status;
    this.storagePoint = itemDetails.storagePoint
      ? new ExtraMiniStoragePointOutput(itemDetails.storagePoint)
      : null;
  }

  id: string;
  reference: string;
  barCode: string;
  state: ItemState;
  status: StepStatus;
  storagePoint?: ExtraMiniStoragePointOutput;
}
