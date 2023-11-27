import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { BooleanValues } from '@glosuite/shared';

export class GetLocationsByStoragePointOptionsDto {
  @IsOptional()
  @IsEnum(BooleanValues)
  @ApiPropertyOptional({
    type: 'enum',
    enum: BooleanValues,
    default: null,
  })
  isVirtual?: BooleanValues;
}
