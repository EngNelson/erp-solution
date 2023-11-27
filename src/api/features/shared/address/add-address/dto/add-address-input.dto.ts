import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator-multi-lang';
import {
  AddressUsage,
  ArrayContainsUniqueValue,
  PositionMap,
  PositionMapInput,
  ValueMap,
  ValueMapInput,
} from '@glosuite/shared';
import { IsPositionMap, IsValueMap } from 'src/api/decorators';

export class AddAddressInput {
  @IsNotEmpty()
  @IsEnum(AddressUsage)
  @ApiProperty({
    enum: AddressUsage,
  })
  usage: AddressUsage;

  @IsOptional()
  @ApiPropertyOptional()
  fullName?: string;

  @IsOptional()
  @ApiPropertyOptional()
  phone?: string;

  @IsOptional()
  @ApiPropertyOptional()
  email?: string;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional()
  postalCode?: number;

  @IsOptional()
  @IsPositionMap()
  @ApiPropertyOptional({
    type: PositionMapInput,
  })
  positionRef?: PositionMap;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayNotContains([null, undefined, ''])
  @IsPositionMap()
  @ArrayContainsUniqueValue()
  @ApiPropertyOptional({
    type: PositionMapInput,
    isArray: true,
  })
  positions?: PositionMap[];

  @IsNotEmpty()
  @IsValueMap()
  @ApiProperty({
    type: ValueMapInput,
  })
  street: ValueMap;

  @IsNotEmpty()
  @IsValueMap()
  @ApiProperty({
    type: ValueMapInput,
  })
  quarter: ValueMap;

  @IsNotEmpty()
  @IsValueMap()
  @ApiProperty({
    type: ValueMapInput,
  })
  city: ValueMap;

  @IsNotEmpty()
  @IsValueMap()
  @ApiProperty({
    type: ValueMapInput,
  })
  region: ValueMap;

  @IsNotEmpty()
  @IsValueMap()
  @ApiProperty({
    type: ValueMapInput,
  })
  country: ValueMap;
}
