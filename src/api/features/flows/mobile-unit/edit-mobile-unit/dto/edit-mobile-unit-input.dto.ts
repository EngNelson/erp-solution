import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import {
  ArrayContainsUniqueValue,
  ISOLang,
  IsTStringInput,
  TString,
} from '@glosuite/shared';
import { IsISOLang } from 'src/api/decorators';
import { MobileUnitStatus } from 'src/domain/enums/flows';
import { IsBoolean } from 'class-validator-multi-lang';

export class EditMobileUnitInput {
  @IsNotEmpty()
  @ApiProperty()
  mobileUnitId: string;

  @IsOptional()
  @ApiPropertyOptional()
  name?: string;

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty()
  isReception: boolean;

  @IsOptional()
  @IsEnum(MobileUnitStatus)
  @ApiPropertyOptional({
    enum: MobileUnitStatus,
  })
  status?: MobileUnitStatus;

  @IsOptional()
  @IsTStringInput()
  @ApiPropertyOptional()
  description?: TString;

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
