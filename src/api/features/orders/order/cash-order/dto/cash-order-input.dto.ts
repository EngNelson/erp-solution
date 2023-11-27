import { ArrayContainsUniqueValue, ISOLang, IsISOLang } from '@glosuite/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  ArrayNotEmpty,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator-multi-lang';
import { CashedAlertInput } from 'src/domain/dto/finance';
import { PaymentMethod } from 'src/domain/enums/finance';
import { CashLevel } from 'src/domain/enums/orders';
import { CashedAlert } from 'src/domain/interfaces/finance';

export class CashOrderInput {
  @IsOptional()
  @ArrayNotEmpty()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiProperty({
    isArray: true,
    type: 'string',
  })
  barcodes?: string[];

  @IsNotEmpty()
  @IsEnum(CashLevel)
  @ApiProperty({
    type: 'enum',
    enum: CashLevel,
  })
  cashLevel: CashLevel;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    type: 'number',
  })
  amount?: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  @ApiPropertyOptional({
    enum: PaymentMethod,
  })
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @ApiPropertyOptional()
  paymentRef?: string;

  @IsOptional()
  @ApiPropertyOptional()
  comment?: string;

  @IsOptional()
  @ApiPropertyOptional({
    type: CashedAlertInput,
  })
  alert?: CashedAlert;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
