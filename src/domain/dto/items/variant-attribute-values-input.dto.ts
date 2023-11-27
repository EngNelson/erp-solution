import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsNotEmpty } from 'class-validator-multi-lang';

export class VariantAttributeValueInput<T> {
  @IsOptional()
  @ApiPropertyOptional()
  variantAttributeValueId?: string;

  @IsOptional()
  @ApiPropertyOptional()
  attributeId?: string;

  @IsNotEmpty()
  @ApiProperty()
  value: T;

  @IsOptional()
  @ApiPropertyOptional()
  unitId?: string;
}
