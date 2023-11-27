import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator-multi-lang';
import { DeliveryMode } from 'src/domain/enums/orders';

export class GetSalesReportInput {
  @IsOptional()
  @ApiPropertyOptional()
  storagePointId?: string;

  @IsOptional()
  @ApiPropertyOptional()
  agentId?: string;

  @IsOptional()
  @IsEnum(DeliveryMode)
  @ApiPropertyOptional({
    type: 'enum',
    enum: DeliveryMode,
  })
  deliveryMode?: DeliveryMode;

  @IsOptional()
  @ApiPropertyOptional()
  startDate?: Date;

  @IsOptional()
  @ApiPropertyOptional()
  endDate?: Date;

  @IsOptional()
  @ApiPropertyOptional()
  specificDate?: Date;
}
