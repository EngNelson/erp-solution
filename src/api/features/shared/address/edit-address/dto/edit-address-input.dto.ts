import { ValueMapInput, ValueMap } from '@glosuite/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator-multi-lang';
import { IsValueMap } from 'src/api/decorators';

export class EditAddressInput {
  @IsNotEmpty()
  @ApiProperty()
  addressId: string;

  @IsOptional()
  @ApiPropertyOptional()
  fullName?: string;

  @IsOptional()
  @ApiPropertyOptional()
  phone?: string;

  @IsOptional()
  @ApiPropertyOptional()
  email?: string;

  @IsOptional()
  @IsValueMap()
  @ApiProperty({
    type: ValueMapInput,
  })
  street?: ValueMap;

  @IsOptional()
  @IsValueMap()
  @ApiProperty({
    type: ValueMapInput,
  })
  quarter?: ValueMap;

  @IsOptional()
  @IsValueMap()
  @ApiProperty({
    type: ValueMapInput,
  })
  city?: ValueMap;

  @IsOptional()
  @IsValueMap()
  @ApiProperty({
    type: ValueMapInput,
  })
  region?: ValueMap;

  @IsOptional()
  @IsValueMap()
  @ApiProperty({
    type: ValueMapInput,
  })
  country?: ValueMap;
}
