import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayNotContains,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
} from 'class-validator-multi-lang';
import { ArrayContainsUniqueValue, ISOLang } from '@glosuite/shared';
import { IsISOLang } from 'src/api/decorators';

export class EnableCollectionsInput {
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

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
