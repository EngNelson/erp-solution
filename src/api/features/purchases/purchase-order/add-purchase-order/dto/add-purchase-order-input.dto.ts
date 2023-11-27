import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator-multi-lang';
import { ArrayContainsUniqueValue, ISOLang } from '@glosuite/shared';
import { IsISOLang } from 'src/api/decorators';
import {
  CustomProductDataInput,
  VariantsToPurchaseInput,
} from 'src/domain/dto/purchases';
import { PurchaseOrderFor, PurchaseType } from 'src/domain/enums/purchases';
import {
  CustomProductData,
  VariantsToPurchaseType,
} from 'src/domain/types/purchases';

export class AddPurchaseOrderInput {
  @IsNotEmpty()
  @ApiProperty()
  storagePointId: string;

  @IsNotEmpty()
  @IsEnum(PurchaseType)
  @ApiProperty({ enum: PurchaseType })
  type: PurchaseType;

  @IsNotEmpty()
  @IsEnum(PurchaseOrderFor)
  @ApiProperty({ enum: PurchaseOrderFor })
  purchaseFor: PurchaseOrderFor;

  @IsOptional()
  @ApiPropertyOptional()
  orderRef?: string;

  @IsOptional()
  @ApiPropertyOptional()
  orderId?: string;

  @IsOptional()
  @ApiPropertyOptional()
  internalNeedId?: string;

  @IsOptional()
  @ApiPropertyOptional()
  assignTo?: string; // user id

  /**
   * Variants added on purchase order
   */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayContainsUniqueValue()
  @ArrayNotContains([null, undefined, ''])
  @ApiPropertyOptional({
    isArray: true,
    type: VariantsToPurchaseInput,
  })
  variantsToPurchase?: VariantsToPurchaseType[];

  /**
   * Custom products list
   */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayContainsUniqueValue()
  @ArrayNotContains([null, undefined, ''])
  @ApiPropertyOptional({
    isArray: true,
    type: CustomProductDataInput,
  })
  customProducts?: CustomProductData[];

  @IsOptional()
  @ApiPropertyOptional()
  comment?: string;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
