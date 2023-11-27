import { ISOLang, IsISOLang } from '@glosuite/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator-multi-lang';

export class ReportOrderInput {
  @IsNotEmpty()
  @ApiProperty()
  orderBarcode: string;

  @IsNotEmpty()
  @IsDateString()
  @ApiPropertyOptional({
    type: Date,
  })
  deliveryDate: Date;

  @IsOptional()
  @ApiPropertyOptional()
  comment?: string;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
