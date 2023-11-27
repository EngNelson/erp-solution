import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator-multi-lang';
import { TString } from '@glosuite/shared';

export class AttributeValueToEditInput {
  @IsNotEmpty()
  @ApiProperty()
  id: string;

  @IsOptional()
  @ApiPropertyOptional()
  code?: string;

  @IsNotEmpty()
  @ApiProperty()
  value: TString | string | number;

  @IsNotEmpty()
  @ApiProperty()
  unitId: string;
}
