import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';
import { SpaceMap, SpaceMapInput, TString } from '@glosuite/shared';
import { IsSpaceMap, IsTStringInput } from 'src/api/decorators';

export class EditAreaInput {
  @IsNotEmpty()
  @ApiProperty()
  areaId: string;

  @IsOptional()
  @ApiPropertyOptional()
  storagePointId?: string;

  @IsOptional()
  @ApiPropertyOptional()
  title?: string;

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
  @ApiPropertyOptional({
    type: Boolean,
  })
  isVirtual: boolean;
}
