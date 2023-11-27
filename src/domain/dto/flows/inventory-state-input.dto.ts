import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
} from 'class-validator';
import { ArrayContainsUniqueValue } from '@glosuite/shared';
import { IsProductQuantity } from 'src/api/decorators';
import { ProductQuantity } from 'src/domain/interfaces';
import { ProductQuantityInput } from '../items';

export class InventoryStateInput {
  @IsNotEmpty()
  @ApiProperty({ type: String })
  variantId: string;

  @IsObject()
  @IsNotEmpty()
  @IsProductQuantity()
  @ApiProperty({ type: ProductQuantityInput })
  inStock: ProductQuantity;

  @IsObject()
  @IsNotEmpty()
  @IsProductQuantity()
  @ApiProperty({ type: ProductQuantityInput })
  counted: ProductQuantity;

  @IsOptional()
  @IsArray()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiPropertyOptional({ type: String, isArray: true })
  itemBarcodes: string[];
}
