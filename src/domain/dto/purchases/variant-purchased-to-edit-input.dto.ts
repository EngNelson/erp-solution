import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { IsEnum, IsNumber, IsPositive } from 'class-validator-multi-lang';
import { PurchaseStatusLine } from 'src/domain/enums/purchases';

export class VariantPurchasedToEditInput {
  @IsNotEmpty()
  @ApiProperty()
  variantPurchasedId: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @ApiPropertyOptional()
  purchaseCost?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @ApiPropertyOptional()
  realCost?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @ApiPropertyOptional()
  customPrice?: number;

  @IsOptional()
  @ApiPropertyOptional()
  supplierId?: string;

  @IsOptional()
  @IsEnum(PurchaseStatusLine)
  @ApiPropertyOptional({ enum: PurchaseStatusLine })
  status?: PurchaseStatusLine;

  @IsOptional()
  @ApiPropertyOptional()
  comment?: string;
}
