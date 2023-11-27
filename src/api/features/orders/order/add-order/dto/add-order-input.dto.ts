import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator-multi-lang';
import { ArrayContainsUniqueValue, ISOLang } from '@glosuite/shared';
import { IsISOLang } from 'src/api/decorators';
import {
  ArticlesOrderedInput,
  GuarantorInput,
  InstalmentInput,
} from 'src/domain/dto/orders';
import { DeliveryMode, OrderType } from 'src/domain/enums/orders';
import { ArticlesOrderedType } from 'src/domain/types/orders';
import { Double } from 'typeorm';
import { PaymentMethod } from 'src/domain/enums/finance';
import {
  GuarantorPayload,
  InsalmentInputValue,
} from 'src/domain/interfaces/orders';

export class AddOrderInput {
  @IsNotEmpty()
  @IsEnum(OrderType)
  @ApiProperty({
    type: 'enum',
    enum: OrderType,
  })
  orderType: OrderType;

  @IsOptional()
  @ApiPropertyOptional()
  magentoOrderID?: string;

  @IsOptional()
  @ApiPropertyOptional()
  sellerCode?: string;

  @IsOptional()
  @IsEnum(DeliveryMode)
  @ApiPropertyOptional({
    type: 'enum',
    enum: DeliveryMode,
  })
  deliveryMode?: DeliveryMode;

  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  @ApiProperty({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @IsOptional()
  @ApiPropertyOptional()
  storagePointId?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    type: Date,
  })
  preferredDeliveryDate?: Date;

  @IsOptional()
  @ApiPropertyOptional({
    type: Double,
  })
  fixedDeliveryFees?: number;

  @IsNotEmpty()
  @ApiProperty()
  billingAddressId: string;

  @IsNotEmpty()
  @ApiProperty()
  deliveryAddressId: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayContainsUniqueValue()
  @ArrayNotContains([null, undefined, ''])
  @ApiProperty({
    type: [ArticlesOrderedInput],
  })
  articlesOrdered: ArticlesOrderedType[];

  @IsOptional()
  @ApiPropertyOptional()
  globalVoucherId?: string;

  @IsOptional()
  @ApiPropertyOptional()
  comment?: string;

  @IsOptional()
  @ApiPropertyOptional({
    type: InstalmentInput,
  })
  instalment?: InsalmentInputValue;

  @IsOptional()
  @ApiPropertyOptional({
    type: GuarantorInput,
  })
  guarantor?: GuarantorPayload; // user id

  @IsOptional()
  @ApiPropertyOptional()
  advance?: number;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
