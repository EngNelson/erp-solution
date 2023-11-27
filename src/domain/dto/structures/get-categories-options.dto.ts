import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator-multi-lang';
import { Status } from '@glosuite/shared';

export class GetCategoriesOptionsDto {
  @IsOptional()
  @ApiPropertyOptional({
    enum: Status,
    default: Status.ENABLED,
  })
  status?: Status;

  @IsOptional()
  @ApiPropertyOptional({
    type: Number,
  })
  depth?: number;
}
