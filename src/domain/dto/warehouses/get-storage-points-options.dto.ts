import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { IsOptional } from 'class-validator-multi-lang';
import { StoragePointType } from '@glosuite/shared';

export class GetStoragePointsOptionsDto {
  @IsOptional()
  @IsEnum(StoragePointType)
  @ApiPropertyOptional({
    enum: StoragePointType,
  })
  storageType?: StoragePointType;

  @IsOptional()
  @ApiPropertyOptional()
  addressId?: string;
}
