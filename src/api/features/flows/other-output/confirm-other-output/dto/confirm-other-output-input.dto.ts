import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { ArrayContainsUniqueValue, ISOLang } from '@glosuite/shared';
import { IsISOLang } from 'src/api/decorators';

export class ConfirmOtherOutputInput {
  @IsNotEmpty()
  @ApiProperty()
  outputReference: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiProperty({
    isArray: true,
    type: String,
  })
  barcodes: string[];

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({
    type: Boolean,
    default: false,
  })
  partialConfirmation: boolean;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
