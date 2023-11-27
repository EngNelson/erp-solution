import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator-multi-lang';
import { ISOLang } from '@glosuite/shared';
import { IsISOLang } from 'src/api/decorators';

export class GetProductVariantByIdInput {
  @IsNotEmpty()
  @ApiProperty()
  id: string;

  @IsOptional()
  @IsISOLang()
  @ApiPropertyOptional({
    enum: ISOLang,
    default: ISOLang.FR,
  })
  lang?: ISOLang;
}
