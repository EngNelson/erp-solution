import { ISOLang } from '@glosuite/shared';
import { StockMovement } from 'src/domain/entities/flows';
import {
  MovementType,
  StockMovementAreaType,
  TriggeredBy,
  TriggerType,
} from 'src/domain/enums/flows';
import { MiniSupplierReturnOutput } from '.';
import { MiniUserOutput } from '../auth';
import { ProductItemItemOutput } from '../items';
import { MiniLocationOutput } from '../warehouses';
import { MiniInventoryOutput } from './mini-inventory-output.dto';
import { MiniReceptionOutput } from './mini-reception-output.dto';
import { ExtraMiniTransfertOutput } from './mini-transfert-output.dto';
import { ExtraMiniOrderOutput } from '../orders';

export class StockMovementItemOutput {
  constructor(stockMovement: StockMovement, lang: ISOLang) {
    this.id = stockMovement.id;
    this.movementType = stockMovement.movementType;
    this.triggerType = stockMovement.triggerType;
    this.triggeredBy = stockMovement.triggeredBy;
    this.productItem = new ProductItemItemOutput(
      stockMovement.productItem,
      lang,
    );
    this.source = stockMovement.sourceType
      ? stockMovement.sourceType === StockMovementAreaType.IN_TRANSIT
        ? StockMovementAreaType.IN_TRANSIT
        : new MiniLocationOutput(stockMovement.sourceLocation, lang)
      : null;
    this.target = stockMovement.targetType
      ? stockMovement.targetType === StockMovementAreaType.IN_TRANSIT
        ? StockMovementAreaType.IN_TRANSIT
        : new MiniLocationOutput(stockMovement.targetLocation, lang)
      : null;
    this.reception = stockMovement.reception
      ? new MiniReceptionOutput(stockMovement.reception)
      : null;
    this.supplierReturn = stockMovement.supplierReturn
      ? new MiniSupplierReturnOutput(stockMovement.supplierReturn)
      : null;
    this.order = stockMovement.order
      ? new ExtraMiniOrderOutput(stockMovement.order)
      : null;
    this.inventory = stockMovement.inventory
      ? new MiniInventoryOutput(stockMovement.inventory, lang)
      : null;
    // this.pickingList = stockMovement.pickingList
    //   ? new MiniPickingListOutput(stockMovement.pickingList)
    //   : null;
    this.transfert = stockMovement.transfert
      ? new ExtraMiniTransfertOutput(stockMovement.transfert)
      : null;
    this.createdBy = stockMovement.createdBy
      ? new MiniUserOutput(stockMovement.createdBy)
      : null;
    this.createdAt = stockMovement.createdAt;
  }

  id: string;
  movementType: MovementType;
  triggerType: TriggerType;
  triggeredBy: TriggeredBy;
  productItem: ProductItemItemOutput;
  source: StockMovementAreaType | MiniLocationOutput;
  target: StockMovementAreaType | MiniLocationOutput;
  reception?: MiniReceptionOutput;
  supplierReturn?: MiniSupplierReturnOutput;
  order?: ExtraMiniOrderOutput;
  inventory?: MiniInventoryOutput;
  // pickingList?: MiniPickingListOutput;
  transfert?: ExtraMiniTransfertOutput;
  createdBy?: MiniUserOutput;
  createdAt: Date;
}
