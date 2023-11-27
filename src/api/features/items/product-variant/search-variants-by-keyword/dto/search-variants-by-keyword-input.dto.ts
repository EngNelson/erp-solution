import { PaginationDto } from '@glosuite/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional } from 'class-validator-multi-lang';

export class SearchVariantsByKeywordInput {
  @IsNotEmpty()
  @ApiProperty()
  keyword: string; // title || sku

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    type: Boolean,
  })
  inStock?: boolean;

  @IsOptional()
  @ApiPropertyOptional()
  pagination?: PaginationDto;
}
