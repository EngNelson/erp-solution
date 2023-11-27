import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { ISOLang } from '@glosuite/shared';
import { IsISOLang } from 'src/api/decorators';

export class GetAddressByIdInput {
  @IsNotEmpty()
  @ApiProperty()
  addressId: string;

  @IsOptional()
  @IsISOLang()
  @ApiPropertyOptional({
    enum: ISOLang,
    default: ISOLang.FR,
  })
  lang?: ISOLang;
}
