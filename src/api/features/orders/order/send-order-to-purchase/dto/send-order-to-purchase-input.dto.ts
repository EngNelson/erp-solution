import { ISOLang, IsISOLang } from '@glosuite/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator-multi-lang';

export class SendOrderToPurchaseInput {
  @IsNotEmpty()
  @ApiProperty()
  orderReference: string;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
