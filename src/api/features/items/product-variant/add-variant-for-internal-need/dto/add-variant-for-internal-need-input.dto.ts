import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  Min,
} from 'class-validator-multi-lang';
import { ArrayContainsUniqueValue, ISOLang, TString } from '@glosuite/shared';
import { IsISOLang, IsTStringInput } from 'src/api/decorators';
import { VariantAttributeValueInput } from 'src/domain/dto/items';
import { VariantAttributeValue } from 'src/domain/types/catalog/items';

export class AddVariantForInternalNeedInput {
  // Inputs for product
  @IsNotEmpty()
  @ApiProperty()
  sku: string;

  @IsNotEmpty()
  @IsTStringInput()
  @ApiProperty({
    type: JSON,
  })
  title: TString;

  @IsNotEmpty()
  @ApiProperty({
    type: [String],
  })
  categoryIds: string[];

  // Input for variant
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Min(0)
  @ApiProperty({
    type: Number,
  })
  salePrice: number;

  // Input for attribute-set
  @ArrayNotEmpty()
  @IsArray()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiProperty({ isArray: true, type: VariantAttributeValueInput })
  attributeValues: VariantAttributeValue<any>[];

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
