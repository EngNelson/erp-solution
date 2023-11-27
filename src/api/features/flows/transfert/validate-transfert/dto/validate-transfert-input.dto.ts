import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator-multi-lang';
import { ArrayContainsUniqueValue, ISOLang } from '@glosuite/shared';
import { IsISOLang } from 'src/api/decorators';

export class ValidateTransfertInput {
  @IsNotEmpty()
  @ApiProperty()
  transfertId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiProperty({
    type: [String],
  })
  mobileUnitIds: string[];

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
