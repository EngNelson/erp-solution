import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsPositive, Min } from 'class-validator';
import {
  ArrayNotContains,
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
} from 'class-validator-multi-lang';
import {
  ArrayContainsUniqueValue,
  Image,
  ImageInput,
  ISOLang,
  MediaGallery,
  MediaGalleryInput,
  TString,
} from '@glosuite/shared';
import { IsISOLang, IsTStringInput } from 'src/api/decorators';
import { VariantAttributeValueInput } from 'src/domain/dto/items';
import { ShippingClass } from 'src/domain/enums/orders';
import { VariantAttributeValue } from 'src/domain/types/catalog/items';

export class AddProductVariantInput {
  @IsNotEmpty()
  @ApiProperty()
  productId: string;

  @IsOptional()
  @ApiPropertyOptional({
    type: ImageInput,
  })
  thumbnail?: Image;

  @IsOptional({ each: true })
  @IsArray()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiPropertyOptional({
    type: [MediaGalleryInput],
  })
  gallery?: MediaGallery[];

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Min(0)
  @ApiProperty({
    type: Number,
  })
  salePrice: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(0)
  @ApiPropertyOptional({ type: Number })
  decouvert?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(0)
  @ApiPropertyOptional({
    type: Number,
  })
  purchaseCost?: number;

  @IsOptional()
  @IsTStringInput()
  @ApiPropertyOptional({
    type: JSON,
  })
  shortDescription?: TString;

  @IsOptional()
  @IsTStringInput()
  @ApiPropertyOptional({
    type: JSON,
  })
  description?: TString;

  @IsNotEmpty()
  @IsEnum(ShippingClass)
  @ApiProperty({ enum: ShippingClass })
  shippingClass: ShippingClass;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @ApiPropertyOptional({ type: Number })
  rentPrice?: number;

  /**
   * For simple product
   */
  @IsOptional()
  @ArrayNotEmpty()
  @IsArray()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiPropertyOptional({ isArray: true, type: VariantAttributeValueInput })
  attributeValues?: VariantAttributeValue<any>[];

  /**
   * For bundled or grouped products
   */
  @IsOptional()
  @ArrayNotEmpty()
  @IsArray()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiPropertyOptional({
    isArray: true,
    type: String,
  })
  variantIds?: string[];

  @IsOptional()
  @IsEnum(ISOLang)
  @IsISOLang()
  @ApiPropertyOptional({ type: 'enum', enum: ISOLang, default: ISOLang.FR })
  lang?: ISOLang;
}
