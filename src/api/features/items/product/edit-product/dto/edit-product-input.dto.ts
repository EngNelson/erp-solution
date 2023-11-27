import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { ArrayContainsUniqueValue, TString } from '@glosuite/shared';
import { IsTStringInput } from 'src/api/decorators';
import { ProductCompositionInput } from 'src/domain/dto/items';
import { ProductType } from 'src/domain/enums/items';
import { ProductCompositionType } from 'src/domain/types/catalog/items';

export class EditProductInput {
  @IsNotEmpty()
  @ApiProperty()
  productId: string;

  @IsOptional()
  @IsTStringInput()
  @ApiPropertyOptional({
    type: JSON,
  })
  title?: TString;

  // @IsOptional()
  // @IsTStringInput()
  // @ApiPropertyOptional({
  //   type: JSON,
  // })
  // description?: TString;

  @IsOptional()
  @ApiPropertyOptional()
  sku?: string;

  @IsOptional()
  @IsEnum(ProductType)
  @ApiProperty({
    enum: ProductType,
    default: ProductType.SIMPLE,
  })
  productType?: ProductType;

  @IsOptional()
  @ApiPropertyOptional({ type: String })
  attributeSetId?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    type: Boolean,
    default: true,
  })
  canBeSold?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    type: Boolean,
    default: true,
  })
  canBeRented?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    type: Boolean,
    default: false,
  })
  canBePackaged?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    type: Boolean,
    default: false,
  })
  mustBePackaged?: boolean;

  @IsOptional()
  @ApiPropertyOptional({
    type: [String],
  })
  categoryIds?: string[];

  /**
   * For GROUPED OR BUNDLED
   */
  @IsOptional()
  @IsArray()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiPropertyOptional({
    type: [ProductCompositionInput],
  })
  children: ProductCompositionType[];
}
