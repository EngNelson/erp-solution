import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator-multi-lang';

export class GetCountersOptionsDto {
  @IsOptional()
  @ApiPropertyOptional()
  reference?: string;

  @IsOptional()
  @ApiPropertyOptional()
  cashierId?: string;

  @IsOptional()
  @ApiPropertyOptional()
  storagePointId?: string;
}
