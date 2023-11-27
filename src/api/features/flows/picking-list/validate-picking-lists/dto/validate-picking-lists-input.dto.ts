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

export class ValidatePickingListInput {
  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiProperty({ type: String, isArray: true })
  pickingListIds: string[];

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
