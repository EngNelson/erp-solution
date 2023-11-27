import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { ISOLang, TString } from '@glosuite/shared';
import { IsISOLang, IsTStringInput } from 'src/api/decorators';

export class AddUnitInput {
  @IsNotEmpty()
  @IsTStringInput()
  @ApiProperty({
    type: JSON,
  })
  title: TString;

  @IsNotEmpty()
  @ApiProperty()
  symbol: string;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
