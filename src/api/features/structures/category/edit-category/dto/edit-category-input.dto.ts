import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  IsArray,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
} from 'class-validator-multi-lang';
import { ArrayContainsUniqueValue, TString } from '@glosuite/shared';
import { IsTStringInput } from 'src/api/decorators';

export class EditCategoryInput {
  @IsNotEmpty()
  @ApiProperty()
  categoryId: string;

  @IsOptional()
  @IsTStringInput()
  @ApiPropertyOptional({
    type: JSON,
  })
  title?: TString;

  @IsOptional()
  @IsTStringInput()
  @ApiProperty()
  description?: TString;

  @IsOptional()
  @ApiProperty()
  symbol: string;

  @IsOptional()
  @ApiPropertyOptional({
    type: Number,
  })
  addInStatistics: 1 | 0;

  @IsOptional()
  @ApiProperty({
    type: String,
  })
  parentCategoryId?: string;

  @IsOptional({ each: true })
  @IsArray()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiProperty({
    type: [String],
  })
  subCategoriesIds?: string[];
}
