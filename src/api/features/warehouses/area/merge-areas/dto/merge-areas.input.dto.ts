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

export class MergeAreasInput {
  @IsNotEmpty()
  @ApiProperty()
  sourceAreaId: string;

  @IsNotEmpty()
  @ApiProperty()
  targetAreaId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiProperty({
    type: [MergeLocationsMapInput],
  })
  mergeLocationsMapping: MergeLocationsMap[];

  // @IsNotEmpty()
  // @IsBoolean()
  // @ApiProperty({
  //   type: Boolean,
  //   default: true,
  // })
  // deleteSourceAreaAfterMerge: boolean;
}
