import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { AddressUsage } from '@glosuite/shared';

export class GetAddressesOptionsInput {
  @IsOptional()
  @IsEnum(AddressUsage)
  @ApiPropertyOptional({
    enum: AddressUsage,
    default: AddressUsage.WAREHOUSES_USAGE,
  })
  usage?: AddressUsage;
}
