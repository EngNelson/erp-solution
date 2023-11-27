import { ArrayContainsUniqueValue, ISOLang, IsISOLang } from '@glosuite/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  ArrayNotEmpty,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator-multi-lang';

export class ValidateOutputInput {
  @IsNotEmpty()
  @ArrayNotEmpty()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiProperty({
    isArray: true,
    type: 'string',
  })
  orderBarcodes: string[];

  @IsNotEmpty()
  @ApiProperty()
  outputById: string; // user id

  // @IsNotEmpty()
  // @ApiProperty()
  // agentPassword: string;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
