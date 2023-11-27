import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional } from 'class-validator-multi-lang';

export class AttributeOptionInput {
  @IsOptional()
  @ApiPropertyOptional()
  attributeOptionId?: string;

  @IsNotEmpty()
  @ApiProperty()
  attributeId: string;

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  required: boolean;
}
