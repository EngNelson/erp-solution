import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayNotContains,
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
} from 'class-validator-multi-lang';
import {
  ArrayContainsUniqueValue,
  MergeLocationsMap,
  MergeLocationsMapInput,
} from '@glosuite/shared';

export class MergeLocationsInput {
  @IsNotEmpty()
  @ApiProperty()
  sourceLocationId: string;

  @IsNotEmpty()
  @ApiProperty()
  targetLocationId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiProperty({
    type: [MergeLocationsMapInput],
  })
  mergeLocationsMapping: MergeLocationsMap[];
}
