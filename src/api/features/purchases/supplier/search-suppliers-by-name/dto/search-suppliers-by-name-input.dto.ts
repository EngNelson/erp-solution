import { PaginationDto } from '@glosuite/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator-multi-lang';

export class SearchSuppliersByNameInput {
  @IsNotEmpty()
  @ApiProperty()
  keyword: string;

  @IsOptional()
  @ApiPropertyOptional()
  pagination?: PaginationDto;
}
