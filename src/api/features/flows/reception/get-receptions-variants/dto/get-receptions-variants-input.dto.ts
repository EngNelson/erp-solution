import { IsISOLang, ISOLang } from '@glosuite/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator-multi-lang';

export class GetReceptionsVariantsInput {
  @IsNotEmpty()
  @ApiProperty()
  specificDate: Date;

  @IsOptional()
  @ApiPropertyOptional()
  storagePointId?: string;

  @IsOptional()
  @IsISOLang()
  @ApiPropertyOptional({
    enum: ISOLang,
    default: ISOLang.FR,
  })
  lang?: ISOLang;
}
