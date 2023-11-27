import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { IsEnum, IsOptional } from 'class-validator-multi-lang';
import { ProductType } from 'src/domain/enums/items';

export class GetProductsOptionsInput {
  @IsOptional()
  @IsEnum(ProductType)
  @ApiPropertyOptional({
    enum: ProductType,
  })
  productType?: ProductType;

  // @IsOptional()
  // // @IsBoolean()
  // @ApiPropertyOptional({
  //   type: Boolean,
  // })
  // canBeSold?: boolean;

  // @IsOptional()
  // // @IsBoolean()
  // @ApiPropertyOptional({
  //   type: Boolean,
  // })
  // canBeRented?: boolean;

  // @IsOptional()
  // // @IsBoolean()
  // @ApiPropertyOptional({
  //   type: Boolean,
  // })
  // canBePackaged?: boolean;

  // @IsOptional()
  // // @IsBoolean()
  // @ApiPropertyOptional({
  //   type: Boolean,
  // })
  // mustBePackaged?: boolean;
}
