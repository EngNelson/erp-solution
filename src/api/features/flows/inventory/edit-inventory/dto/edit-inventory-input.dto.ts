import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { IsEnum } from 'class-validator-multi-lang';
import { ISOLang, TString } from '@glosuite/shared';
import { IsISOLang, IsTStringInput } from 'src/api/decorators';

export class EditInventoryInput {
  @IsNotEmpty()
  @ApiProperty()
  inventoryId: string;

  @IsOptional()
  @ApiPropertyOptional()
  locationId?: string;

  @IsOptional()
  @IsTStringInput()
  @ApiPropertyOptional({ type: JSON })
  title?: TString;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
