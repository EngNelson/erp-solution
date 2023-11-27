import { PaginationDto } from '@glosuite/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator-multi-lang';

export class SearchProductsByKeywordInput {
  @IsNotEmpty()
  @ApiProperty()
  keyword: string; // title || sku

  @IsOptional()
  @ApiPropertyOptional()
  pagination?: PaginationDto;
}
