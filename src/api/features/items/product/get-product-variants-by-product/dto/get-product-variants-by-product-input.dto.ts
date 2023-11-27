import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsNotEmpty } from 'class-validator-multi-lang';
import { PaginationDto, PaginationInput } from '@glosuite/shared';

export class GetProductVariantsByProductInput {
  @IsNotEmpty()
  @ApiProperty()
  productId: string;

  @IsOptional()
  @ApiPropertyOptional({
    type: PaginationInput,
  })
  pagination: PaginationDto;
}
