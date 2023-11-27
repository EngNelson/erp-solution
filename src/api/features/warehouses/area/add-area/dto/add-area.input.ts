import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';
import { SpaceMap, SpaceMapInput, TString } from '@glosuite/shared';
import { IsSpaceMap, IsTStringInput } from 'src/api/decorators';

export class AddAreaInput {
  @IsNotEmpty()
  @ApiProperty()
  storagePointId: string;

  @IsNotEmpty()
  @ApiProperty()
  title: string;

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

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    type: Boolean,
    default: false,
  })
  isVirtual?: boolean;
}
