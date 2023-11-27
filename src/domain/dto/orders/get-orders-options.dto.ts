import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsPositive,
} from 'class-validator-multi-lang';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryMode, OrderSource, OrderStep } from 'src/domain/enums/orders';
import {
  InstalmentType,
  PaymentMethod,
  PaymentMode,
  PaymentStatus,
} from 'src/domain/enums/finance';
import { StepStatus } from 'src/domain/enums/flows';
import { Type } from 'class-transformer';
import { BooleanValues } from '@glosuite/shared';

export class GetOrdersOptionsDto {
  @IsOptional()
  @ApiPropertyOptional()
  reference?: string;

  @IsOptional()
  @ApiPropertyOptional()
  sellerCode?: string;

  @IsOptional()
  @IsEnum(DeliveryMode)
  @ApiPropertyOptional({ type: 'enum', enum: DeliveryMode })
  deliveryMode?: DeliveryMode;

  @IsOptional()
  @IsEnum(PaymentMode)
  @ApiPropertyOptional({ type: 'enum', enum: PaymentMode })
  paymentMode?: PaymentMode;

  @IsOptional()
  @IsEnum(PaymentStatus)
  @ApiPropertyOptional({ type: 'enum', enum: PaymentStatus })
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @ApiPropertyOptional()
  preferedDeliveryDate?: Date;

  @IsOptional()
  @IsEnum(OrderSource)
  @ApiPropertyOptional({ type: 'enum', enum: OrderSource })
  orderSource?: OrderSource;

  @IsOptional()
  @IsEnum(StepStatus)
  @ApiPropertyOptional({ type: 'enum', enum: StepStatus })
  orderStatus?: StepStatus;

  @IsOptional()
  @IsEnum(OrderStep)
  @ApiPropertyOptional({ type: 'enum', enum: OrderStep })
  orderStep?: OrderStep;

  @IsOptional()
  @IsEnum(BooleanValues)
  @ApiPropertyOptional({
    type: 'enum',
    enum: BooleanValues,
  })
  withInstalments?: BooleanValues;

  @IsOptional()
  @IsEnum(InstalmentType)
  @ApiPropertyOptional({ type: 'enum', enum: InstalmentType })
  instalmentType?: InstalmentType;

  @IsOptional()
  @ApiPropertyOptional()
  startDate?: Date;

  @IsOptional()
  @ApiPropertyOptional()
  endDate?: Date;

  @IsOptional()
  @ApiPropertyOptional()
  specificDate?: Date;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @IsPositive()
  @ApiPropertyOptional({
    type: Number,
  })
  year?: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  @ApiPropertyOptional({ type: 'enum', enum: PaymentMethod })
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @ApiPropertyOptional()
  storagePointId?: string;

  @IsOptional()
  @ApiPropertyOptional()
  assignToId?: string;

  @IsOptional()
  @IsEnum(BooleanValues)
  @ApiPropertyOptional({
    type: 'enum',
    enum: BooleanValues,
  })
  advance?: BooleanValues;

  // add-adress
  @IsOptional()
  @ApiPropertyOptional()
  city?: string;

  @IsOptional()
  @ApiPropertyOptional()
  quarter?: string;
}
