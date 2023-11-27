import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
} from 'class-validator-multi-lang';

export class VariantToReceivedInput {
  @IsNotEmpty()
  @ApiProperty()
  variantId: string;

  @IsNotEmpty()
  @IsPositive()
  @IsNumber()
  @ApiProperty()
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @ApiProperty()
  purchaseCost: number;

  @IsOptional()
  @ApiPropertyOptional()
  supplierId?: string;
}
