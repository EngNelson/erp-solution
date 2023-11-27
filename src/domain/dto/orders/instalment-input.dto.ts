import { ArrayContainsUniqueValue } from '@glosuite/shared';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotContains,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
} from 'class-validator-multi-lang';
import { InstalmentType } from 'src/domain/enums/finance';
import { InstalmentModelInput } from './instalment-model-input.dto';
import { InstalmentModelValue } from 'src/domain/interfaces/orders';

export class InstalmentInput {
  @IsNotEmpty()
  @IsEnum(InstalmentType)
  @ApiProperty({
    type: 'enum',
    enum: InstalmentType,
  })
  type: InstalmentType;

  @IsNotEmpty()
  @ApiProperty()
  taux: number;

  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayContainsUniqueValue()
  @ArrayNotContains([null, undefined, ''])
  @ApiProperty({
    type: [InstalmentModelInput],
  })
  instalments: InstalmentModelValue[];
}
