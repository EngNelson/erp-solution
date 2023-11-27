import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator-multi-lang';
import { ISOLang } from '@glosuite/shared';
import { IsISOLang } from 'src/api/decorators';

export class CancelReceptionInput {
  @IsNotEmpty()
  @ApiProperty()
  receptionId: string;

  @IsNotEmpty()
  @ApiProperty({ type: Boolean })
  cancelWithChild: boolean;

  @IsNotEmpty()
  @ApiProperty()
  cancelReason: string;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
