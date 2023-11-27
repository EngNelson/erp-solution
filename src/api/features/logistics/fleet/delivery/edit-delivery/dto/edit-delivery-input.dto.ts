import { ISOLang, IsISOLang } from '@glosuite/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsEnum } from 'class-validator-multi-lang';
import { TransportationMeans } from 'src/domain/enums/logistics';



export class EditDeliveriesInput {

  @IsOptional()
  @ApiPropertyOptional()
  deliveryId?: string;

  @IsOptional()
  @ApiPropertyOptional()
  orderId?: string;

  @IsOptional()
  @ApiPropertyOptional()
  transportationMeans?: TransportationMeans;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;

}
