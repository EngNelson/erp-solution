import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator-multi-lang';
import { BooleanValues } from '@glosuite/shared';

export class GetLocationsByAreaOptionsDto {
  @IsOptional()
  @IsEnum(BooleanValues)
  @ApiPropertyOptional({
    type: 'enum',
    enum: BooleanValues,
    default: null,
  })
  isVirtual?: BooleanValues;
}
