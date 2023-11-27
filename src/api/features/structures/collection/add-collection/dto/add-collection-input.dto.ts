import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator-multi-lang';
import {
  ArrayContainsUniqueValue,
  CollectionType,
  Status,
  TString,
} from '@glosuite/shared';
import { IsTStringInput } from 'src/api/decorators';

export class AddCollectionInput {
  @IsNotEmpty()
  @IsTStringInput()
  @ApiProperty({
    type: JSON,
  })
  title: TString;

  @IsOptional()
  @IsTStringInput()
  @ApiPropertyOptional()
  description?: TString;

  @IsOptional()
  @IsEnum(Status)
  @ApiPropertyOptional({
    enum: Status,
    default: Status.ENABLED,
  })
  status?: Status;

  @IsOptional()
  @IsEnum(CollectionType)
  @ApiPropertyOptional({
    enum: CollectionType,
    default: CollectionType.DEFAULT,
  })
  collectionType?: CollectionType;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    type: Date,
  })
  startDate?: Date;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    type: Date,
  })
  endDate?: Date;

  @IsOptional({ each: true })
  @IsArray()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiPropertyOptional({ type: [String] })
  categoryIds?: string[];

  @IsOptional()
  @ApiPropertyOptional({
    type: String,
  })
  parentCollecctionId?: string;

  @IsOptional({ each: true })
  @IsArray()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiPropertyOptional({
    type: [String],
  })
  subCollectionsIds?: string[];
}
