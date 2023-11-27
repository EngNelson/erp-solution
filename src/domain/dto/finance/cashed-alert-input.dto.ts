import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator-multi-lang';
import { AlertType } from 'src/domain/enums/finance';

export class CashedAlertInput {
  @IsNotEmpty()
  @IsEnum(AlertType)
  @ApiProperty({
    enum: AlertType,
  })
  type: AlertType;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    type: 'number',
  })
  amount: number;

  @IsOptional()
  @ApiPropertyOptional()
  details?: string;
}
