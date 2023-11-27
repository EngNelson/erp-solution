import { ArrayContainsUniqueValue, ISOLang, IsISOLang } from '@glosuite/shared';
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
import {
  ArticlesOrderedToEditInput,
  GuarantorInput,
  InstalmentInput,
} from 'src/domain/dto/orders';
import { PaymentMethod, PaymentMode } from 'src/domain/enums/finance';
import { DeliveryMode } from 'src/domain/enums/orders';
import {
  GuarantorPayload,
  InsalmentInputValue,
} from 'src/domain/interfaces/orders';
import { ArticlesOrderedToEditType } from 'src/domain/types/orders';
import { Double } from 'typeorm';

export class EditOrderInput {
  @IsNotEmpty()
  @ApiProperty()
  orderId: string;

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

  @IsOptional()
  @IsEnum(PaymentMode)
  @ApiPropertyOptional({
    type: 'enum',
    enum: PaymentMode,
  })
  paymentMode?: PaymentMode;

  @IsOptional()
  @IsEnum(PaymentMethod)
  @ApiPropertyOptional({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @ApiPropertyOptional()
  paymentRef?: string;

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

  @IsOptional()
  @ApiPropertyOptional()
  billingAddressId?: string;

  @IsOptional()
  @ApiPropertyOptional()
  deliveryAddressId?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayContainsUniqueValue()
  @ArrayNotContains([null, undefined, ''])
  @ApiProperty({
    type: [ArticlesOrderedToEditInput],
  })
  articlesOrdered: ArticlesOrderedToEditType[];

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
  guarantor?: GuarantorPayload;

  @IsOptional()
  @ApiPropertyOptional()
  advance?: number;

  // @IsOptional()
  // @ApiPropertyOptional({
  //   type: SpecialPaymentInput,
  // })
  // specialPayment?: SpecialPaymentValue;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
