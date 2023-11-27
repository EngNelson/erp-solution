import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotContains,
  ArrayNotEmpty,
  IsArray,
} from 'class-validator-multi-lang';
import { ArrayContainsUniqueValue, PaginationInput } from '@glosuite/shared';

export class GetCollectionsByIdsInput {
  @ArrayNotEmpty()
  @IsArray()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiProperty({ type: [String] })
  ids: string[];

  @ApiProperty()
  pagination: PaginationInput;
}
