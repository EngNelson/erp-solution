import {
  ArrayContainsUniqueValue,
  IsTStringInput,
  TString,
} from '@glosuite/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
} from 'class-validator-multi-lang';
import { VariantAttributeValue } from 'src/domain/types/catalog/items';
import { VariantAttributeValueInput } from '../items';

export class CustomProductDataInput {
  @IsNotEmpty()
  @IsTStringInput()
  @ApiProperty({
    type: JSON,
  })
  title: TString;

  @IsOptional()
  @ApiPropertyOptional()
  sku?: string;

  @IsOptional()
  @ArrayNotEmpty()
  @IsArray()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiPropertyOptional({ isArray: true, type: VariantAttributeValueInput })
  attributeValues?: VariantAttributeValue<any>[];

  @IsNotEmpty()
  @IsPositive()
  @IsNumber()
  @ApiProperty()
  quality: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @ApiProperty()
  purchaseCost: number;

  @IsOptional()
  @ApiPropertyOptional()
  supplierId?: string;
}
