import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator-multi-lang';
import { ISOLang } from '@glosuite/shared';
import { IsISOLang } from 'src/api/decorators';
import { OrderSensitivesData } from 'src/domain/enums/orders';

export class ApplyOrderChangesInput {
  @IsNotEmpty()
  @ApiProperty()
  orderId: string;

  @IsNotEmpty()
  @IsEnum(OrderSensitivesData)
  @ApiProperty({
    type: 'enum',
    enum: OrderSensitivesData,
  })
  dataToApply: OrderSensitivesData;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
