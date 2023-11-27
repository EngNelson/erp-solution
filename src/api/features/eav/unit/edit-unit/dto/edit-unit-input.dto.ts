import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator-multi-lang';
import { ISOLang, TString } from '@glosuite/shared';
import { IsISOLang, IsTStringInput } from 'src/api/decorators';

export class EditUnitInput {
  @IsNotEmpty()
  @ApiProperty()
  unitId: string;

  @IsOptional()
  @IsTStringInput()
  @ApiPropertyOptional({
    type: JSON,
  })
  title?: TString;

  @IsOptional()
  @ApiPropertyOptional()
  symbol?: string;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
