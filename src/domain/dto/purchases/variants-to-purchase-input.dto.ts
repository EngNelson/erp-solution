import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class VariantsToPurchaseInput {
  @IsNotEmpty()
  @ApiProperty()
  variantId: string;

  @IsNotEmpty()
  @IsPositive()
  @IsNumber()
  @ApiProperty()
  quantity: number;

  // @IsNotEmpty()
  // @IsNumber()
  // @IsPositive()
  // @ApiProperty()
  // purchaseCost: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @ApiPropertyOptional()
  customPrice?: number;

  @IsOptional()
  @ApiPropertyOptional()
  supplierId?: string;
}
