import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator-multi-lang';

export class GuarantorInput {
  @IsNotEmpty()
  @ApiProperty()
  fullname: string;

  @IsNotEmpty()
  @ApiProperty()
  phone: string;

  @IsOptional()
  @ApiPropertyOptional()
  email?: string;

  @IsOptional()
  @ApiPropertyOptional()
  company?: string;

  @IsOptional()
  @ApiPropertyOptional()
  position?: string;
}
