import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { arrayNotContains, ArrayNotEmpty } from 'class-validator';
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
  ISOLang,
  TString,
} from '@glosuite/shared';
import { IsISOLang, IsTStringInput } from 'src/api/decorators';

export class EditCollectionInput {
  @IsNotEmpty()
  @ApiProperty()
  collectionId: string;

  @IsOptional()
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
  @IsDateString()
  @ApiPropertyOptional({
    type: Date,
  })
  startDate?: Date;

  @IsOptional()
  @IsEnum(CollectionType)
  @ApiPropertyOptional({ enum: CollectionType })
  collectionType?: CollectionType;

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
  @ApiProperty({ type: [String] })
  categoryIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiPropertyOptional({
    type: String,
    isArray: true,
  })
  variantIds?: string[];

  @IsOptional()
  @ApiProperty({
    type: String,
  })
  parentCollecctionId?: string;

  @IsOptional({ each: true })
  @IsArray()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiProperty({
    type: [String],
  })
  subCollectionsIds?: string[];

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
