import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayNotContains,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsOptional,
} from 'class-validator-multi-lang';
import { ArrayContainsUniqueValue } from '@glosuite/shared';

export class EnableCategoriesInput {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiProperty({
    type: [String],
  })
  ids: string[];

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ default: false })
  withChildrens?: boolean;
}
