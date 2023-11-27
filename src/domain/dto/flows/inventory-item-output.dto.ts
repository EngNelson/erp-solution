import { getLangOrFirstAvailableValue, ISOLang } from '@glosuite/shared';
import { OperationStatus } from 'src/domain/enums/flows';
import { InventoryModel } from 'src/domain/interfaces/flows';
import {
  InventoryStateItemOutput,
  MiniInvestigationOutput,
  MiniStockMovementOutput,
} from '.';
import { MiniUserOutput } from '../auth';
import { MiniLocationOutput } from '../warehouses';

export class InventoryItemOutput {
  constructor(inventoryModel: InventoryModel, lang: ISOLang) {
    this.id = inventoryModel.inventory.id;
    this.reference = inventoryModel.inventory.reference;
    this.title = getLangOrFirstAvailableValue(
      inventoryModel.inventory.title,
      lang,
    );
    this.status = inventoryModel.inventory.status;
    this.location = new MiniLocationOutput(
      inventoryModel.inventory.location,
      lang,
    );
    this.inventoryStates = inventoryModel.inventoryStates
      ? inventoryModel.inventoryStates.map(
          (inventoryState) =>
            new InventoryStateItemOutput(inventoryState, lang),
        )
      : [];
    this.investigations = inventoryModel.inventory.investigations
      ? inventoryModel.inventory.investigations.map(
          (investigation) => new MiniInvestigationOutput(investigation),
        )
      : [];
    this.stockMovements = inventoryModel.inventory.stockMovements
      ? inventoryModel.inventory.stockMovements.map(
          (stockMovement) => new MiniStockMovementOutput(stockMovement, lang),
        )
      : [];
    this.createdAt = inventoryModel.inventory.createdAt;
    this.createdBy = new MiniUserOutput(inventoryModel.inventory.createdBy);
    this.lastUpdate = inventoryModel.inventory.lastUpdate
      ? inventoryModel.inventory.lastUpdate
      : null;
    this.validatedBy = inventoryModel.inventory.validatedBy
      ? new MiniUserOutput(inventoryModel.inventory.validatedBy)
      : null;
    this.validatedAt = inventoryModel.inventory.validatedAt
      ? inventoryModel.inventory.validatedAt
      : null;
    this.confirmedBy = inventoryModel.inventory.confirmedBy
      ? new MiniUserOutput(inventoryModel.inventory.confirmedBy)
      : null;
    this.confirmedAt = inventoryModel.inventory.confirmedAt
      ? inventoryModel.inventory.confirmedAt
      : null;
    this.canceledBy = inventoryModel.inventory.canceledBy
      ? new MiniUserOutput(inventoryModel.inventory.canceledBy)
      : null;
    this.canceledAt = inventoryModel.inventory.canceledAt
      ? inventoryModel.inventory.canceledAt
      : null;
  }

  id: string;
  reference: string;
  title: string;
  status: OperationStatus;
  location: MiniLocationOutput;
  inventoryStates?: InventoryStateItemOutput[];
  investigations?: MiniInvestigationOutput[];
  stockMovements?: MiniStockMovementOutput[];
  createdAt: Date;
  createdBy: MiniUserOutput;
  lastUpdate?: Date;
  validatedBy?: MiniUserOutput;
  validatedAt?: Date;
  confirmedBy?: MiniUserOutput;
  confirmedAt?: Date;
  canceledBy?: MiniUserOutput;
  canceledAt?: Date;
}
