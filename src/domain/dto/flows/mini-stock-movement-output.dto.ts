import { ISOLang } from '@glosuite/shared';
import { StockMovement } from 'src/domain/entities/flows';
import {
  MovementType,
  StockMovementAreaType,
  TriggeredBy,
  TriggerType,
} from 'src/domain/enums/flows';
import { ProductItemItemOutput } from '../items';
import { MiniLocationOutput } from '../warehouses';

export class MiniStockMovementOutput {
  constructor(stockMovement: StockMovement, lang: ISOLang) {
    this.id = stockMovement.id;
    this.movementType = stockMovement.movementType;
    this.triggerType = stockMovement.triggerType;
    this.triggeredBy = stockMovement.triggeredBy;
    this.productItem = new ProductItemItemOutput(
      stockMovement.productItem,
      lang,
    );
    this.source =
      stockMovement.sourceType === StockMovementAreaType.LOCATION
        ? new MiniLocationOutput(stockMovement.sourceLocation, lang)
        : stockMovement.sourceType;
    this.target =
      stockMovement.targetType === StockMovementAreaType.LOCATION
        ? new MiniLocationOutput(stockMovement.targetLocation, lang)
        : stockMovement.targetType;
    this.createdAt = stockMovement.createdAt;
  }

  id: string;
  movementType: MovementType;
  triggerType: TriggerType;
  triggeredBy: TriggeredBy;
  productItem: ProductItemItemOutput;
  source?: MiniLocationOutput | StockMovementAreaType;
  target?: MiniLocationOutput | StockMovementAreaType;
  createdAt: Date;
}
