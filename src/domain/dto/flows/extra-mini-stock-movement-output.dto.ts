import { StockMovement } from 'src/domain/entities/flows';
import { MovementType, TriggeredBy, TriggerType } from 'src/domain/enums/flows';

export class ExtraMiniStockMovementOutput {
  constructor(stockMovement: StockMovement) {
    this.id = stockMovement.id;
    this.movementType = stockMovement.movementType;
    this.triggerType = stockMovement.triggerType;
    this.triggeredBy = stockMovement.triggeredBy;
  }

  id: string;
  movementType: MovementType;
  triggerType: TriggerType;
  triggeredBy: TriggeredBy;
}
