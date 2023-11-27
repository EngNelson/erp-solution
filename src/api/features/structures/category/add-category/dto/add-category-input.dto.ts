import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator-multi-lang';
import { ArrayContainsUniqueValue, Status, TString } from '@glosuite/shared';
import { IsTStringInput } from 'src/api/decorators';

export class AddCategoryInput {
  @IsNotEmpty()
  @IsTStringInput()
  @ApiProperty({
    type: JSON,
  })
  title: TString;

  @IsOptional()
  @IsTStringInput()
  @ApiProperty()
  description?: TString;

  @IsOptional()
  @IsEnum(Status)
  @ApiPropertyOptional({
    enum: Status,
    default: Status.ENABLED,
  })
  status?: Status;

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({
    type: Boolean,
    default: false,
  })
  addInStatistics = false;

  @IsNotEmpty()
  @ApiProperty()
  symbol: string;

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
