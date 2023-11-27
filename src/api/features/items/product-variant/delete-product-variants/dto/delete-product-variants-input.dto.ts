import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayNotContains,
  ArrayNotEmpty,
  IsArray,
} from 'class-validator-multi-lang';
import { ArrayContainsUniqueValue } from '@glosuite/shared';

export class DeleteProductVariantsInput {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiProperty({
    type: [String],
  })
  ids: string[];
}
