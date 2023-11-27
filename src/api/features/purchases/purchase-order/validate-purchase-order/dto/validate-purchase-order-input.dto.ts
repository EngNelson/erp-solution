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
import { EditedVariantsToPurchaseInput } from 'src/domain/dto/purchases';
import { EditedVariantsToPurchaseType } from 'src/domain/types/purchases';

export class ValidatePurchaseOrderInput {
  @IsNotEmpty()
  @ApiProperty()
  purchaseOrderId: string;

  /**
   * Edit variants quantity
   * state line
   */
  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayContainsUniqueValue()
  @ArrayNotContains([null, undefined, ''])
  @ApiProperty({
    type: EditedVariantsToPurchaseInput,
    isArray: true,
  })
  validatedVariantsToPurchase: EditedVariantsToPurchaseType[];

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
