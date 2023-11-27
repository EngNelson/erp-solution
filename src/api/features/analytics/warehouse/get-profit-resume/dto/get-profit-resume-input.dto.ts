import { IsISOLang, ISOLang } from '@glosuite/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  Length,
  Max,
  Min,
} from 'class-validator-multi-lang';

export class GetProfitResumeInput {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @IsPositive()
  @ApiProperty({
    type: Number,
  })
  year: number;

  @IsOptional()
  @ApiPropertyOptional()
  storagePointId?: string;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
