import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { MovementType, TriggeredBy, TriggerType } from 'src/domain/enums/flows';

export class GetStockMovementsOptionsDto {
  @IsOptional()
  @IsEnum(MovementType)
  @ApiPropertyOptional({ enum: MovementType })
  movementType?: MovementType;

  @IsOptional()
  @IsEnum(TriggerType)
  @ApiPropertyOptional({ enum: TriggerType })
  triggerType?: TriggerType;

  @IsOptional()
  @IsEnum(TriggeredBy)
  @ApiPropertyOptional({ enum: TriggeredBy })
  triggeredBy?: TriggeredBy;
}
