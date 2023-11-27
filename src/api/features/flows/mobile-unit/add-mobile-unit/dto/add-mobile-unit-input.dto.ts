import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { ArrayContainsUniqueValue, ISOLang, TString } from '@glosuite/shared';
import { IsISOLang, IsTStringInput } from 'src/api/decorators';

export class AddMobileUnitInput {
  @IsNotEmpty()
  @ApiProperty()
  transfertId: string;

  @IsNotEmpty()
  @ApiProperty()
  name: string;

  @IsOptional()
  @IsTStringInput()
  @ApiPropertyOptional()
  description?: TString;

  @IsOptional()
  @ApiPropertyOptional()
  password?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiPropertyOptional({
    type: [String],
  })
  itemBarCodes?: string[];

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
