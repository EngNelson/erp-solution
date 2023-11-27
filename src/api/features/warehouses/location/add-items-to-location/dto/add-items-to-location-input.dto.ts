import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { ArrayContainsUniqueValue, ISOLang } from '@glosuite/shared';
import { IsISOLang } from 'src/api/decorators';
import { IsBoolean } from 'class-validator-multi-lang';

export class AddItemsToLocationInput {
  @IsNotEmpty()
  @ApiProperty()
  locationId: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiProperty({ type: String, isArray: true })
  barcodes: string[];

  @IsOptional()
  @ApiPropertyOptional()
  comment?: string;

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty()
  isStorage: boolean;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
