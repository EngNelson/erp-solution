import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotContains,
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import { ArrayContainsUniqueValue } from '@glosuite/shared';

export class MobileUnitsToCompleteInput {
  @IsNotEmpty()
  @ApiProperty()
  mobileUnitId: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayNotContains([null, undefined, ''])
  @ArrayContainsUniqueValue()
  @ApiProperty({
    type: String,
    isArray: true,
  })
  receivedItemBarcodes: string[];
}
