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
  EditedVariantsToReceivedInput,
  MobileUnitsToCompleteInput,
  ProductItemsToReceivedInput,
} from 'src/domain/dto/flows';
import {
  EditedVariantsToReceivedType,
  MobileUnitsToCompleteType,
  ProductItemsToReceivedType,
} from 'src/domain/types/flows';

export class ValidateReceptionInput {
  @IsNotEmpty()
  @ApiProperty()
  receptionId: string;

  /**
   * Edit variants quantities
   * Required for receptionType = PURCHASE_ORDER
   */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiPropertyOptional({
    type: EditedVariantsToReceivedInput,
    isArray: true,
  })
  validatedVariantsToReceived?: EditedVariantsToReceivedType[];

  /**
   * Mobile units to complete
   * Required for receptionType = TRANSFERT
   */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiPropertyOptional({
    type: MobileUnitsToCompleteInput,
    isArray: true,
  })
  mobileUnitsToComplete?: MobileUnitsToCompleteType[];

  /**
   * Variants with items
   * Required for receptionType = DELIVERY_FAILURE | CANCELED_IP | REJET_CLIENT
   */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiPropertyOptional({
    type: ProductItemsToReceivedInput,
    isArray: true,
  })
  productItemsToReceived?: ProductItemsToReceivedType[];

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
