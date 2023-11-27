import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { ISOLang } from '@glosuite/shared';
import { IsISOLang } from 'src/api/decorators';

export class SendInternalNeedInput {
  @IsNotEmpty()
  @ApiProperty()
  internalNeedId: string;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
