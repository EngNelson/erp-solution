import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator-multi-lang';
import {
  SpaceMap,
  SpaceMapInput,
  StoragePointStatus,
  StoragePointType,
  TString,
} from '@glosuite/shared';
import { IsSpaceMap, IsTStringInput } from 'src/api/decorators';

export class EditStoragePointInput {
  @IsNotEmpty()
  @ApiProperty()
  storagePointId: string;

  @IsOptional()
  @ApiPropertyOptional()
  addressId?: string;

  @IsOptional()
  @IsEnum(StoragePointType)
  @ApiPropertyOptional({
    enum: StoragePointType,
  })
  storageType?: StoragePointType;

  @IsOptional()
  @ApiPropertyOptional()
  name?: string;

  @IsOptional()
  @IsTStringInput()
  @ApiPropertyOptional()
  description?: TString;

  @IsOptional()
  @ApiProperty({
    type: 'integer',
  })
  isPrimary?: number;
  // @IsOptional()
  // @ApiPropertyOptional()
  // locationKeywords?: string;

  @IsOptional()
  @IsEnum(StoragePointStatus)
  @ApiPropertyOptional({
    type: 'enum',
    enum: StoragePointStatus,
    default: StoragePointStatus.OPEN,
  })
  status?: StoragePointStatus;

  @IsOptional()
  @IsSpaceMap()
  @ApiPropertyOptional({
    type: SpaceMapInput,
  })
  space?: SpaceMap;

  // @IsOptional()
  // @IsNumber()
  // @ApiPropertyOptional({
  //   type: Number,
  // })
  // volume?: number;

  // @IsOptional()
  // @IsNumber()
  // @ApiPropertyOptional({
  //   type: Number,
  // })
  // surface?: number;

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({
    type: Boolean,
  })
  allowSales: boolean;

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({
    type: Boolean,
  })
  allowVirtualZones: boolean;
}
