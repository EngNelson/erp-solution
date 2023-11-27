import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotContains,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator-multi-lang';
import { ArrayContainsUniqueValue, ISOLang, TString } from '@glosuite/shared';
import { IsISOLang, IsTStringInput } from 'src/api/decorators';
import { ProductCompositionInput } from 'src/domain/dto/items';
import { ProductType } from 'src/domain/enums/items';
import { ProductCompositionType } from 'src/domain/types/catalog/items';

export class AddProductInput {
  @IsNotEmpty()
  @ApiProperty()
  sku: string;

  @IsNotEmpty()
  @IsTStringInput()
  @ApiProperty({
    type: JSON,
  })
  title: TString;


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

  @IsNotEmpty()
  @ApiProperty({
    type: [String],
  })
  categoryIds: string[];

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

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
