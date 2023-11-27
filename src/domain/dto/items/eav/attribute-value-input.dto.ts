import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { TString } from '@glosuite/shared';

export class AttributeValueInput {
  @IsOptional()
  @ApiPropertyOptional()
  code?: string;

  @IsNotEmpty()
  @ApiProperty()
  value: TString | string | number;

  @IsOptional()
  @ApiPropertyOptional()
  unitId?: string;
}
