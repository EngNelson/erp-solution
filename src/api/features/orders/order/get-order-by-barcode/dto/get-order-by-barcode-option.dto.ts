import { BooleanValues, ISOLang, IsISOLang } from '@glosuite/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator-multi-lang';

export class GetOrderByBarcodeOption {
  @IsNotEmpty()
  @IsEnum(BooleanValues)
  @ApiProperty({
    type: 'enum',
    enum: BooleanValues,
    default: BooleanValues.FALSE,
  })
  withDetails: BooleanValues;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
