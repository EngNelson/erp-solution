import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { IsEnum, IsOptional } from 'class-validator-multi-lang';
import { ISOLang, TString } from '@glosuite/shared';
import { IsISOLang, IsTStringInput } from 'src/api/decorators';

export class AddInventoryInput {
  @IsNotEmpty()
  @ApiProperty()
  locationId: string;

  @IsNotEmpty()
  @IsTStringInput()
  @ApiProperty({ type: JSON })
  title: TString;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
