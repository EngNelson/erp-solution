import { ArrayContainsUniqueValue, ISOLang, IsISOLang } from '@glosuite/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator-multi-lang';
import { OutputType } from 'src/domain/enums/flows';

export class CreateOtherOutputInput {
  @IsNotEmpty()
  @IsEnum(OutputType)
  @ApiProperty({ enum: OutputType })
  outputType: OutputType;

  @IsOptional()
  @ApiPropertyOptional()
  magentoOrderID?: string;

  @IsNotEmpty()
  @ApiProperty()
  storagePointRef: string;

  @IsOptional()
  @ApiPropertyOptional({
    type: String,
  })
  comment?: string;

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

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
