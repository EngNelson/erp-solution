import { ISOLang, IsISOLang } from '@glosuite/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator-multi-lang';
import { Address } from 'src/domain/entities/shared';


export class EditDeliveryPointInput {

  @IsOptional()
  @ApiPropertyOptional()
  deliveryPointId?: string;

  @IsOptional()
  @ApiPropertyOptional()
  deliveryPointAddress?: Address;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;

}
