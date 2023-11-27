import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import {
  IsBoolean,
  IsNotEmpty,
  IsNotEmptyObject,
  IsNumber,
  IsOptional,
  ValidateIf,
} from 'class-validator-multi-lang';
import {
  AddressMap,
  AddressMapInput,
  isNullOrWhiteSpace,
  SpaceMap,
  SpaceMapInput,
  StoragePointStatus,
  StoragePointType,
  TString,
} from '@glosuite/shared';
import { IsSpaceMap, IsTStringInput } from 'src/api/decorators';

export class AddStoragePointInput {
  @IsOptional()
  @ValidateIf((o) => !o.address)
  @IsNotEmpty()
  @ApiProperty()
  addressId?: string;

  @IsOptional()
  @ValidateIf((o) => isNullOrWhiteSpace(o.addressId))
  @IsNotEmptyObject()
  @ApiProperty({
    type: AddressMapInput,
  })
  address?: AddressMap;

  @IsNotEmpty()
  @IsEnum(StoragePointType)
  @ApiProperty({
    type: 'enum',
    enum: StoragePointType,
    default: StoragePointType.WAREHOUSE,
  })
  storageType: StoragePointType;

  @IsNotEmpty()
  @ApiProperty()
  name: string;

  @IsOptional()
  @IsTStringInput()
  @ApiPropertyOptional()
  description?: TString;

  @IsOptional()
  @ApiProperty({
    type: 'integer',
  })
  isPrimary?: number;

  // @IsNotEmpty()
  // @ApiProperty()
  // locationKeywords: string;

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

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  allowSales?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  allowVirtualZones?: boolean;

  /**
   * Config des zones et emplacements par defaut
   */
  // Default Reception Area
  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty()
  addDefaultReceptionArea: boolean;

  // Default Awaiting sav
  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty()
  addDefaultAwaitingSAVArea: boolean;

  // Default Preparation area
  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty()
  addDefaultPreparationArea: boolean;

  // Default Depot vente area
  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty()
  addDefaultDepotVenteArea: boolean;

  // Default Output area
  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty()
  addDefaultOutputArea: boolean;
}
