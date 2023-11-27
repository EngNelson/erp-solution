import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { IsNumber, IsPositive } from 'class-validator-multi-lang';
import { OperationStatus } from 'src/domain/enums/flows';
import { PurchaseType } from 'src/domain/enums/purchases';

export class GetPurchaseOrdersOptionsDto {
  @IsOptional()
  @IsEnum(OperationStatus)
  @ApiPropertyOptional({ enum: OperationStatus })
  status?: OperationStatus;

  @IsOptional()
  @ApiPropertyOptional()
  storagePointId?: string;

  @IsOptional()
  @ApiPropertyOptional()
  startDate?: Date;

  @IsOptional()
  @ApiPropertyOptional()
  endDate?: Date;

  @IsOptional()
  @ApiPropertyOptional()
  specificDate?: Date;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @IsPositive()
  @ApiPropertyOptional({
    type: Number,
  })
  year?: number;

  @IsOptional()
  @ApiPropertyOptional()
  reference?: string;

  @IsOptional()
  @IsEnum(PurchaseType)
  @ApiPropertyOptional({
    type: PurchaseType,
  })
  type?: PurchaseType;

  // @IsOptional()
  // @ApiPropertyOptional()
  // orderRef?: string;
}
