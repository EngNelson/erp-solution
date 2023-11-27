import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  ValidateIf,
} from 'class-validator-multi-lang';
import {
  SpaceMap,
  SpaceMapInput,
  TString,
  ValueMap,
  ValueMapInput,
} from '@glosuite/shared';
import { IsSpaceMap, IsTStringInput, IsValueMap } from 'src/api/decorators';
import { AddLocationInput } from '../../add-location/dto';

export class EditLocationInput {
  @IsNotEmpty()
  @ApiProperty()
  locationId: string;

  @ValidateIf((o: AddLocationInput) => !o.parentLocationId)
  @IsOptional()
  @ApiPropertyOptional()
  areaId?: string;

  @ValidateIf((o: AddLocationInput) => !o.areaId)
  @IsOptional()
  @ApiPropertyOptional()
  parentLocationId?: string;

  @IsOptional()
  @ApiPropertyOptional()
  name?: string;

  @IsOptional()
  @IsTStringInput()
  @ApiPropertyOptional()
  description?: TString;

  @IsOptional()
  @IsSpaceMap()
  @ApiPropertyOptional({
    type: SpaceMapInput,
  })
  space?: SpaceMap;

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({
    type: Boolean,
  })
  isVirtual: boolean;

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({
    type: Boolean,
  })
  isProviderDedicated: boolean;

  @ValidateIf((o: AddLocationInput) => o.isProviderDedicated)
  @IsOptional()
  @IsValueMap()
  @ApiPropertyOptional({
    type: ValueMapInput,
  })
  dedicatedSupplier?: ValueMap;
}
