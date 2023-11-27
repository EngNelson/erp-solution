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
import { VariantPurchasedToEditInput } from 'src/domain/dto/purchases';
import { PurchaseOrderFor, PurchaseType } from 'src/domain/enums/purchases';
import { VariantPurchasedToEditType } from 'src/domain/types/purchases';

export class EditPurchaseOrderInput {
  @IsNotEmpty()
  @ApiProperty()
  purchaseOrderId: string;

  @IsOptional()
  @ApiPropertyOptional()
  storagePointId?: string;

  @IsOptional()
  @IsEnum(PurchaseType)
  @ApiPropertyOptional({ enum: PurchaseType })
  type?: PurchaseType;

  @IsOptional()
  @IsEnum(PurchaseOrderFor)
  @ApiPropertyOptional({ enum: PurchaseOrderFor })
  purchaseFor?: PurchaseOrderFor;

  @IsOptional()
  @ApiPropertyOptional()
  assignTo?: string; // user email

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
    type: VariantPurchasedToEditInput,
  })
  variantsPurchasedToEdit?: VariantPurchasedToEditType[];

  @IsOptional()
  @ApiPropertyOptional()
  comment?: string;

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
