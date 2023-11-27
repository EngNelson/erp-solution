import { ISOLang, IsISOLang } from '@glosuite/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator-multi-lang';
import { DeliveryStatus, TransportationMeans } from 'src/domain/enums/logistics';


export class AddDeliveryInput{
  @IsOptional()
  @ApiPropertyOptional()
  orderId: string;

  @IsNotEmpty()
  @IsEnum(DeliveryStatus)
  @ApiProperty({
    type: 'enum',
    enum: DeliveryStatus,
  })
  status: DeliveryStatus;

  @IsNotEmpty()
  @IsEnum(TransportationMeans)
  @ApiProperty({
    type: 'enum',
    enum: TransportationMeans,
  })
  transportation: TransportationMeans;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;

}